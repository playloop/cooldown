import { describe, expect, it } from 'vitest';
import { DASH, DEATH, PLAYER, SEEKER, TIMING } from '../config';
import { overlaps, rect } from '../core/rect';
import { moveAndCollide, moveDash, platformY } from './collision';
import { makeIce, carveIce, iceRects } from './ice';
import { NO_INPUT } from './input-frame';
import { applyControls } from './movement';
import { spawnPlayer, bodyOf } from './player';
import { collectRefills } from './pickups';
import { spawnSeekers, stepSeekers, chooseTarget, type Seeker } from './seeker';
import { extendStreak, startStreak } from './streak';
import { newGame, stepGame } from './game';
import { stepPlayer } from './step-player';
import { platformsOf } from './streak-list';
import type { Room } from '../world/room';

const dt = TIMING.step;
const room: Room = { name: 'heat', solids: [rect(0, 0, 32, 2)], spikes: [],
  spawn: { x: 2, y: 2 }, exit: rect(31, 2, 1, 4), diagonal: true,
  ice: [rect(6, 2, 2, 8)], pickups: [{ x: 10, y: 6 }], seekers: [{ x: 24, y: 8 }] };
const air = { ...spawnPlayer({ x: 5, y: 5 }), support: null, coyote: 0 };
const streak = extendStreak(startStreak(6, 6, 0, 1.1), 9, 0.2);

 describe('ice carving', () => {
  it('cuts a generous local opening and keeps ice above and below', () => {
    const cells = makeIce(room.ice ?? []);
    const cut = carveIce(cells, { x: 5, y: 6 }, { x: 9, y: 6 });
    expect(cut.length).toBeLessThan(cells.length);
    expect(cut.some((c) => overlaps(c, bodyOf({ x: 7, y: 6 })))).toBe(false);
    expect(cut.some((c) => c.y >= 8)).toBe(true);
    expect(cut.some((c) => c.y < 4)).toBe(true);
    const packed = iceRects(cut);
    for (let x = 5.75; x < 8.5; x += 0.25) for (let y = 2.25; y < 10; y += 0.5) {
      const point = rect(x, y, 0.001, 0.001);
      expect(packed.some((c) => overlaps(c, point))).toBe(cut.some((c) => overlaps(c, point)));
    }
  });
  it('does not melt from a normal jump or lingering streak', () => {
    const ice = makeIce(room.ice ?? []);
    const moved = stepPlayer(air, NO_INPUT, dt, room, [streak], 0.3, ice);
    expect(moved.ice).toEqual(ice);
  });
  it('cannot carve through a solid wall in front of the ice', () => {
    const blocked = { ...room, solids: [...room.solids, rect(5.5, 2, 0.5, 10)] };
    const ice = makeIce(room.ice ?? []);
    const moved = stepPlayer(air, { ...NO_INPUT, right: true, dashPressed: true }, dt, blocked, [], 0, ice);
    expect(moved.ice).toEqual(ice);
  });
});

describe('angled dashes and ramps', () => {
  it.each([rect(10, 0, 1, 18), rect(0, 7, 32, 1)])('stops both dash axes at a wall or ceiling', (wall) => {
    const moved = moveDash({ x: 9, y: 6, vx: 12, vy: 12 }, 0.2, [wall]);
    expect(moved.blocked).toBe(true);
    expect(moved.x - 9).toBeCloseTo(moved.y - 6);
    expect(moved.vx).toBe(0);
    expect(moved.vy).toBe(0);
    const p = { ...air, x: 9, y: 6 };
    const stepped = stepPlayer(p, { ...NO_INPUT, right: true, up: true, dashPressed: true }, 0.2,
      { ...room, solids: [wall] }, [], 0);
    expect(stepped.player.dashTime).toBe(0);
  });
  it('unlocks diagonals explicitly, keeps speed normalized, and commits the direction', () => {
    const input = { ...NO_INPUT, right: true, up: true, dashPressed: true };
    expect(applyControls(air, input, dt).player.vy).toBe(0);
    const dash = applyControls(air, input, dt, true).player;
    expect(Math.hypot(dash.vx, dash.vy)).toBeCloseTo(DASH.speed);
    expect(dash.vy).toBeGreaterThan(0);
    const continued = applyControls(dash, { ...NO_INPUT, down: true, left: true }, dt, true).player;
    expect(continued.vx).toBe(dash.vx);
    expect(continued.vy).toBe(dash.vy);
  });
  it.each([1, -1])('walks both ways on a ramp (direction %s)', (direction) => {
    const ramp = { x0: 4, x1: 9, y: 3, endY: 8 };
    const x = direction > 0 ? 5 : 8;
    const p = { x, y: platformY(ramp, x) + PLAYER.halfHeight, vx: direction * 7.5, vy: -0.25 };
    const moved = moveAndCollide(p, dt, [], [ramp]);
    expect(moved.support).toBe('streak');
    expect(moved.y).toBeCloseTo(platformY(ramp, moved.x) + PLAYER.halfHeight);
  });
  it('lands from above, passes up from below, and loses support as the ramp cools', () => {
    const ramp = extendStreak(startStreak(4, 3, 0, 1), 9, 0.2, 8);
    const platforms = platformsOf([ramp], 0.3);
    expect(moveAndCollide({ x: 6, y: 6, vx: 0, vy: -10 }, 0.1, [], platforms).support).toBe('streak');
    expect(moveAndCollide({ x: 6, y: 5, vx: 0, vy: 10 }, 0.1, [], platforms).support).toBe(null);
    expect(platformsOf([ramp], 1.21)).toEqual([]);
  });
});

describe('refills and retries', () => {
  it('leaves a pickup untouched when full; restores one without extending an active dash', () => {
    const pickups = [{ x: air.x, y: air.y }];
    expect(collectRefills(air, pickups).pickups).toEqual(pickups);
    const result = collectRefills({ ...air, canDash: false, dashTime: 0.08 }, pickups);
    expect(result.player.canDash).toBe(true);
    expect(result.player.dashTime).toBe(0.08);
    expect(result.pickups).toEqual([]);
  });
  it('resets all room state on death while preserving the room unlock', () => {
    const original = newGame([room]);
    const dead = { ...original, ice: [], pickups: [], seekers: [], streaks: [streak],
      phase: { kind: 'dying' as const, since: 0, at: room.spawn, cause: 'spikes' as const } };
    const reset = stepGame(dead, NO_INPUT, DEATH.respawnDelay + dt, [room]).state;
    expect(reset.ice).toEqual(original.ice);
    expect(reset.pickups).toEqual(original.pickups);
    expect(reset.seekers).toEqual(original.seekers);
    expect(reset.streaks).toEqual([]);
    const diagonal = stepPlayer({ ...reset.player, support: null }, { ...NO_INPUT, up: true, dashPressed: true }, dt, room, [], reset.clock);
    expect(diagonal.player.dashY).toBeGreaterThan(0);
  });
});

describe('seekers', () => {
  const farPlayer = spawnPlayer({ x: 30, y: 2 });
  const waiting = spawnSeekers([{ x: 14, y: 6 }]);
  it('waits without visible heat and respects occlusion and range', () => {
    expect(chooseTarget({ x: 14, y: 6 }, [], [], 0.2)).toBe(null);
    expect(chooseTarget({ x: 14, y: 6 }, [streak], [rect(10, 0, 1, 18)], 0.2)).toBe(null);
    expect(chooseTarget({ x: 30, y: 6 }, [streak], [], 0.2)).toBe(null);
    expect(chooseTarget({ x: 14, y: 6 }, [streak], [], 0.2)?.x).toBe(9);
  });
  it('telegraphs then keeps its target when that streak cools or new heat appears', () => {
    const locked = stepSeekers(waiting, [streak], [], 0.2, dt, farPlayer, farPlayer).seekers;
    expect(locked[0]?.mode).toBe('windup');
    const other = extendStreak(startStreak(17, 8, 2, 1), 19, 2.2);
    const charged = stepSeekers(locked, [other], [], 2.2, SEEKER.windup, farPlayer, farPlayer).seekers;
    expect(charged[0]?.mode).toBe('charge');
    expect(charged[0]?.target).toEqual(locked[0]?.target);
  });
  it('stops at walls, recovers, and never carves them', () => {
    const seeker: Seeker = { x: 14, y: 6, target: { x: 6, y: 6 }, mode: 'charge', timer: 0 };
    const wall = rect(10, 0, 1, 12);
    const moved = stepSeekers([seeker], [], [wall], 1, 1, farPlayer, farPlayer).seekers[0];
    expect(moved?.mode).toBe('recover');
    expect(moved?.x).toBeGreaterThanOrEqual(11 + SEEKER.radius);
    expect(wall).toEqual(rect(10, 0, 1, 12));
  });
  it('detects a fast player crossing a stationary seeker', () => {
    const start = spawnPlayer({ x: 12, y: 5.25 });
    const end = { ...start, x: 16 };
    expect(stepSeekers(waiting, [], [], 0, dt, start, end).hit).toBe(true);
  });
});
