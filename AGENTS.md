# AGENTS.md: Cooldown

Read this before changing anything. It is the manual for coding agents (and
people) working on this repo.

## What this is

A small browser platformer built around heat: an air dash leaves a white-hot
streak you can stand on until it cools, about a second. The whole look is one
WebGL fragment shader that draws a thermal camera: every pixel is one heat
number pushed through the inferno colormap, so a streak's color is how long it
has left.

Ten rooms add ice carving, dash refills, diagonals, and charging seekers.
The original four-room game remains at the episode 1 tags.

It is built in public, with a build-along series. The code is part of what people
see, so it has to stay simple and clean. `docs/EPISODES.md` is the plan.

## Run, test, build

```bash
npm install
cp .githooks/denylist.example .githooks/denylist.local
# Edit denylist.local for your own private terms before installing the hooks.
bash .githooks/install.sh     # once per clone: turns on the commit gates
npm run dev                   # local dev server
npm test                      # vitest, all game logic
npm run check                 # typecheck + lint + tests + build (run before every push)
npm run package:web           # dist/ zipped for an HTML5 upload
bash scripts/release-check.sh # whole-tree gates, before anything goes public
```

Debug URL flags: `?debug` exposes `window.cooldown` (live state plus every
event), `?debug&room=2` starts in a given room (0-based), and `?debug&native`
renders at the screen's real resolution instead of the 1280x720 canvas (for
recording footage; the camera overlay scales with it).

## Structure

```
src/
  config.ts            every tuning number (physics, dash, streak lifetime, spikes)
  main.ts              composition root: wires the parts, runs the loop
  core/                rect math, fixed-step timing (no game knowledge)
  sim/                 the game rules, pure functions, no DOM, no WebGL
    game.ts            one fixed step of the whole game; phases, rooms, events
    step-player.ts     one step of the runner: controls, collision, dash refill, fall blame
    movement.ts        input to velocity: run, jump, coyote time, buffer, dash
    collision.ts       move and push out of solids; streaks are one-way platforms
    streak.ts          one streak's heat math
    streak-list.ts     creating, stretching and dropping streaks
    death.ts           hazards (a list) and the cause of death
  world/               rooms as plain data, plus their tests
  events/              GameEvent union and a tiny typed EventBus (the analytics seam)
  audio/               browser playback, local cue mixing, saved volume settings
  input/               keyboard to InputFrame, with press latching
  render/              SceneFrame (state to uniform arrays), WebGL helpers, shaders/
  ui/                  the DOM text layer (HUD, title, cleared screen)
  testing/             scripted players and known routes, used by tests only
```

The dependency direction is one way: `sim` knows nothing about `render`,
`input`, `ui` or `events` sinks. `render` reads game state but never changes it.

## Code rules

- **DRY first.** Before writing a helper, search for the one that exists. A
  number that two places need lives in `config.ts` (the shader gets it through
  `render/shader-source.ts` defines, never a second literal).
- **One reason to change per module.** New system, new file.
- **Strict TypeScript.** No `any`, no `@ts-ignore`, no non-null `!` without a
  proven invariant. Discriminated unions with an exhaustive `switch` for state.
- **The simulation is pure and deterministic.** Same state plus same input
  gives the same result. Never read the clock, the DOM or `Math.random` in `sim/`.
- **Tests for every rule.** Physics, streak cooling, collision, death causes,
  room solvability. A fix that makes a failing test pass is a repair; a change
  that makes passing tests wrong is a design change and says so in the commit.
- **No em dashes** anywhere (the commit hook blocks them). American spelling.
- **Never use an em dash in anything you write**, including your replies in a session: this repo
  is built on camera, so what you say is on screen too. Use a period, comma, colon or parentheses.

## How things grow

- **A new room:** add it to `world/rooms.ts` and add a route that clears it to
  `testing/routes.ts`. The room tests then prove it spawns on ground, has a
  closed floor, fits the shader, and can be cleared.
- **A new way to die:** add the cause to `DeathCause` and a hazard to `HAZARDS`
  in `sim/death.ts`. If something knocks the runner into a hazard, set its
  `fallBlame` instead. Causes are a contract with whatever records deaths:
  never reuse one for a new meaning.
- **A different streak lifetime** (a cold room, an experiment): pass it to
  `updateStreaks`. Each streak carries the lifetime it was born with, and the
  renderer reads it from the streak, so they cannot disagree.
- **A new thing that is hot or cold:** heat is meant to become a rule of the
  world. Give it a layer function in `render/shaders/scene.frag` and pack its
  data in `SceneFrame`; keep the rule itself in `sim/`.
- **Analytics:** the Playloop SDK subscribes to the `EventBus` in `main.ts`.
  `events/telemetry.ts` maps game events to telemetry. The simulation never
  imports the SDK.

## Shader rules

Only published primitives (box, circle, segment, isosceles triangle, smooth
min) and their standard operators, with a source link in the comment. Each
layer in `scene.frag` is one function that takes the heat so far and returns
it. Keep the per-pixel loops bounded by the `MAX_*` limits.

## Leak gates

This repo goes public. `.githooks/pre-commit` blocks any staged line with an em
dash or a denylisted term; `scripts/release-check.sh` scans the whole tree.
The denylist is `.githooks/denylist.local`, gitignored and machine-local. A
missing denylist refuses the commit on purpose: a gate with nothing to check
would pass everything. Never bypass the hook.

## Git

Work on `main`. Small commits, one idea each, described in plain words. Stage
explicit files, never a whole directory.
