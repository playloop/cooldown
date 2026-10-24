import { describe, expect, it } from 'vitest';
import { WORLD } from '../config';
import { overlaps, right } from '../core/rect';
import { supportUnder } from '../sim/collision';
import { spikeHitbox } from '../sim/death';
import { bodyOf, spawnPlayer } from '../sim/player';
import { after, afterDash, atX, holdRight, oneAttempt, play, type Move } from '../testing/play-script';
import { ROUTES } from '../testing/routes';
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
    expect(outcome?.type).toBe(index === ROOMS.length - 1 ? 'run_completed' : 'room_entered');
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
  it('makes the gap deliberately too hard: possible, but with a tiny timing window', () => {
    const gap = clearRate(2);
    expect(gap).toBeGreaterThan(0);
    expect(gap).toBeLessThan(0.05);
  });

  it('keeps the room that teaches the streak forgiving', () => {
    expect(clearRate(1)).toBeGreaterThan(0.25);
  });
});
