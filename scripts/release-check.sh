#!/usr/bin/env bash
#
# release-check.sh: the WHOLE TREE version of the pre-commit gates, plus the
# full build. Run it before pushing anything you would not want to publish.
#
# The pre-commit hook only sees STAGED ADDITIONS, which is right for a commit
# gate (an untouched line elsewhere must not block unrelated work) and wrong for
# a release gate. This one reads every tracked file.
#
#   bash scripts/release-check.sh
#
# Exit 0 means clean. Anything else means do not push.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"
fail=0
say_fail() { echo "FAIL: $*"; fail=1; }
say_ok()   { echo "ok:   $*"; }

# --- 1. Leak audit, whole tree ------------------------------------------------
# Read the head of a failure, not the tail: "REFUSED" means the denylist is
# missing (copy it in), "FAILED" means a real match.
if out="$(bash scripts/leak-audit.sh 2>&1)"; then
  say_ok "$out"
else
  echo "$out"
  say_fail "leak audit"
fi

# --- 2. Whole-tree em dash scan -----------------------------------------------
# Byte escape so this file never contains the character it bans.
EM="$(printf '\342\200\224')"
dashes="$(git grep -I -n -F -e "$EM" -- . 2>/dev/null || true)"
if [ -n "$dashes" ]; then
  echo "$dashes" | head -20
  say_fail "tracked files contain an em dash"
else
  say_ok "no em dashes"
fi

# --- 3. Dead relative markdown links -----------------------------------------
dead=0
while IFS= read -r md; do
  while IFS= read -r link; do
    [ -z "$link" ] && continue
    case "$link" in http*|\#*|mailto:*) continue ;; esac
    target="${link%%#*}"
    [ -z "$target" ] && continue
    if [ ! -e "$(dirname "$md")/$target" ]; then
      echo "FAIL: $md links to missing $target"
      dead=1
    fi
  done < <(grep -oE '\]\([^)]+\)' "$md" 2>/dev/null | sed 's/^](//; s/)$//')
done < <(git ls-files '*.md')
if [ "$dead" -ne 0 ]; then fail=1; else say_ok "no dead relative markdown links"; fi

# --- 4. Typecheck, lint, tests, build -----------------------------------------
if npm run --silent check >/dev/null 2>&1; then
  say_ok "npm run check (typecheck, lint, tests, build)"
else
  say_fail "npm run check. Run it to see why."
fi

echo ""
if [ "$fail" -ne 0 ]; then echo "RELEASE CHECK FAILED. Do not push."; exit 1; fi
echo "RELEASE CHECK PASSED."
