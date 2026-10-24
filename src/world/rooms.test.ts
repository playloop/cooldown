import { describe, expect, it } from 'vitest';
import { WORLD } from '../config';
import { overlaps, right } from '../core/rect';
import { supportUnder } from '../sim/collision';
import { spikeHitbox } from '../sim/death';
import { bodyOf, spawnPlayer } from '../sim/player';
import { after, afterDash, atX, holdRight, oneAttempt, play, type Move } from '../testing/play-script';
import { ROUTES, AIR_ROUTES } from '../testing/routes';
import { ROOMS } from './rooms';

const ROUTE_TABLE: Readonly<Record<string, readonly Move[]>> = ROUTES;

describe.each(ROOMS.map((room, index) => ({ room, index })))('room $index, $room.name', ({ room, index }) => {
  it('spawns the runner standing on ground, clear of spikes', () => {
    const p = spawnPlayer(room.spawn);
    expect(supportUnder(p, room.solids, [])).toBe('ground');
    expect(room.solids.some((s) => overlaps(bodyOf(p), s))).toBe(false);
    expect(room.spikes.some((row) => overlaps(bodyOf(p), spikeHitbox(row)))).toBe(false);
  });

  it('has a closed floor, so every fall ends on ground or spikes', () => {
    for (let x = 0.025; x < WORLD.width; x += 0.05) {
      expect(room.solids.some((s) => s.y === 0 && s.x <= x && x <= right(s)), `open floor at x ${x}`).toBe(true);
    }
  });

  it('keeps its exit inside the screen', () => {
    expect(room.exit.x).toBeGreaterThanOrEqual(0);
    expect(right(room.exit)).toBeLessThanOrEqual(WORLD.width);
  });

  it('can be cleared by its known route', () => {
    const route = ROUTE_TABLE[room.name];
    expect(route, `add a route for "${room.name}" in src/testing/routes.ts`).toBeDefined();
    const { events } = play(ROOMS, index, holdRight(route ?? []), oneAttempt);
    const outcome = events.find((e) => e.type !== 'run_started');
    expect(outcome?.type, JSON.stringify({outcome})).toBe(index === ROOMS.length - 1 ? 'run_completed' : 'room_entered');
  });
});

/**
 * Share of a grid of jump-dash-jump timings that clears a room. Not a human
 * success rate, but it ranks rooms by how forgiving their timing is.
 */
function clearRate(index: number): number {
  let wins = 0;
  let total = 0;
  for (let jumpX = 6; jumpX <= 11; jumpX += 0.25) {
    for (let dashAfter = 0.1; dashAfter <= 0.6; dashAfter += 0.025) {
      for (const wait of [0, 0.05, 0.1]) {
        const route = holdRight([
          { press: 'jump', when: atX(jumpX) },
          { press: 'dash', when: after(dashAfter) },
          { press: 'jump', when: afterDash(wait) },
        ]);
        const { events } = play(ROOMS, index, route, oneAttempt, 6);
        if (events.some((e) => e.type === 'room_entered')) wins++;
        total++;
      }
    }
  }
  return wins / total;
}

// Each grid replays about a thousand attempts (around a second), so give it headroom on a busy machine.
describe('difficulty', { timeout: 20_000 }, () => {
  it('introduces ice on safe ground instead of the old mandatory difficulty spike', () => {
    expect(ROOMS[2]?.spikes).toHaveLength(0);
    expect(ROOMS[2]?.ice?.length).toBeGreaterThan(0);
  });

  it('keeps the room that teaches the streak forgiving', () => {
    expect(clearRate(1)).toBeGreaterThan(0.25);
  });
});


describe('optional aerial routes', () => {
  it.each([4, 6, 8, 9])('clears room %s faster than its resting route', (index) => {
    const name = ROOMS[index]?.name ?? '';
    const route = ROUTE_TABLE[name] ?? [];
    const airRoutes: Readonly<Record<string, readonly Move[]>> = AIR_ROUTES;
    const fast = play(ROOMS, index, holdRight(airRoutes[name] ?? []), oneAttempt);
    const main = play(ROOMS, index, holdRight(route), oneAttempt);
    expect(fast.events.some((e) => e.type === 'room_entered' || e.type === 'run_completed')).toBe(true);
    expect(fast.state.runTime).toBeLessThan(main.state.runTime);
  });
});


describe('main-route timing tolerance', () => {
  it.each([2, 3, 4, 5, 6, 7, 8, 9])('clears room %s with nearby jump and dash timings', (index) => {
    const moves = ROUTE_TABLE[ROOMS[index]?.name ?? ''] ?? [];
    let wins = 0;
    for (const shift of [-0.25, 0, 0.25]) for (const delay of [-0.025, 0, 0.025]) {
      const varied = moves.map((move): Move => ({ ...move, when: (state, since) =>
        move.when({ ...state, player: { ...state.player, x: state.player.x - shift } }, since - delay) }));
      const result = play(ROOMS, index, holdRight(varied), oneAttempt, 8);
      if (result.events.some((e) => e.type === 'room_entered' || e.type === 'run_completed')) wins++;
    }
    expect(wins).toBeGreaterThanOrEqual(6);
  });
});
