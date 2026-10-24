#!/usr/bin/env bash
#
# leak-audit.sh: whole-tree scan for denylisted terms before publishing.
#
# The pre-commit hook only checks each commit's additions. This checks the WHOLE
# tracked tree at once, which is what you want before the repo goes public or a
# batch gets pushed. It greps every tracked file for the denylist plus email
# addresses, absolute home paths and key-shaped strings, and exits non-zero with
# a report if anything matches. Run it from anywhere in the repo:
#
#   bash scripts/leak-audit.sh
#
# The denylist lives OUTSIDE the tracked tree in .githooks/denylist.local
# (gitignored). If the terms were written here, this script would be the leak.

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

denylist_file="$repo_root/.githooks/denylist.local"
if [ ! -f "$denylist_file" ]; then
  echo "LEAK AUDIT REFUSED: .githooks/denylist.local is missing."
  echo "Copy .githooks/denylist.example to .githooks/denylist.local and fill it in"
  echo "(it is gitignored). A leak audit with no denylist would pass on anything,"
  echo "which is worse than failing."
  exit 2
fi
DENYLIST="$(grep -v '^\s*#' "$denylist_file" | grep -v '^\s*$' | paste -sd'|' -)"
if [ -z "$DENYLIST" ]; then
  echo "LEAK AUDIT REFUSED: .githooks/denylist.local has no terms in it."
  exit 2
fi

EMAIL='[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
# Reserved example domains (RFC 2606) are never a leak.
EMAIL_OK='@(example\.(com|org|net)|[A-Za-z0-9.-]+\.(test|example|invalid|localhost))'
HOMEPATH='/(Users|home)/[A-Za-z0-9._-]+'
KEYSHAPE='(sk-[A-Za-z0-9]{16,}|sk_live_[A-Za-z0-9]+|pk_live_[A-Za-z0-9]+|gh[pousr]_[A-Za-z0-9]{20,})'
# Machine-generated lockfiles carry upstream authors' addresses, which are not ours.
# The denylist scan still reads the lockfile: a denylisted package name is a real hit.
LOCKFILE=':(exclude)package-lock.json'

hits=0
report=""

# scan <label> <pattern> [allow-pattern] [pathspec]
scan() {
  local label="$1" pattern="$2" allow="${3:-}" pathspec="${4:-.}"
  local out
  out="$(git grep -I -n -i -E "$pattern" -- . "$pathspec" 2>/dev/null || true)"
  if [ -n "$allow" ] && [ -n "$out" ]; then
    out="$(printf '%s\n' "$out" | grep -v -i -E "$allow" || true)"
  fi
  if [ -n "$out" ]; then
    report="${report}
== ${label} ==
${out}
"
    hits=1
  fi
}

scan "denylisted term" "$DENYLIST"
scan "email address" "$EMAIL" "$EMAIL_OK" "$LOCKFILE"
scan "absolute home path" "$HOMEPATH" "" "$LOCKFILE"
scan "key-shaped string" "$KEYSHAPE" "" "$LOCKFILE"

if [ "$hits" -ne 0 ]; then
  echo "LEAK AUDIT FAILED. The tracked tree contains:"
  printf '%s\n' "$report"
  echo "Remove the matches above before publishing."
  exit 1
fi

terms="$(grep -cvE '^\s*#|^\s*$' "$denylist_file")"
files="$(git ls-files | wc -l | tr -d ' ')"
echo "Leak audit clean: $terms denylisted terms, plus emails, home paths and key shapes, over $files tracked files."
exit 0
