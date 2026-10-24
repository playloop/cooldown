# Expansion playtest

Version 0.2.0. Ten rooms, keyboard only. A first clear is the main goal;
optional aerial routes reward another run. The fun and difficulty still need
human playtesting.

## Controls

- Move: Left/Right or A/D.
- Jump: Space, Z, W, or Up. Hold for a full jump.
- Dash: X, Shift, or K, while airborne.
- From room 6: hold Up/W or Down/S to aim diagonally as you dash.
  Space and Z jump without aiming. No pure vertical dash.
- Touch solid ground or a hollow diamond to refill one dash. Streaks do not refill.
- Dying restarts the current room after 0.7 seconds. Its ice, diamonds, and seekers reset.

## Progression

Movement (1-2), ice (3-4), refills (5), diagonals and combinations (6-7),
seekers (8-9), then a combined finale (10). A seeker marks a point, charges
there, and rests. It cannot retarget mid-charge or pass through walls.

## Verification

`npm run check` covers the pure simulation, shader packing, and build.
`world/rooms.test.ts` replays a complete route through every room and compares
faster aerial routes against resting routes in rooms 5, 7, 9, and 10. Nearby
timing variations exercise the main paths. These are solvability checks, not
human success rates.

`sim/heat-mechanics.test.ts` checks local carving, reset behavior, normalized
and committed diagonals, one-way slopes, refills, seeker line of sight,
locked targets, recovery, and swept contact. Wall and ceiling impacts stop
both dash axes, preserving the actual straight streak.

For an isolated room, use `?debug&room=5` (zero-based). Use `?debug&native`
for full-resolution screenshots. Test with an empty `VITE_PLAYLOOP_INGEST_KEY`
to avoid mixing automated verification with player data.

Before a public build replaces the four-room version, update its page text,
controls, and screenshots to match. This playtest does not publish that update.
