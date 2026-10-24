import { describe, expect, it } from 'vitest';
import { PLAYER, WORLD } from '../config';
import { rect } from '../core/rect';
import { moveAndCollide, supportUnder, type Platform } from './collision';

const floor = rect(0, 0, 32, 2);
const wall = rect(10, 2, 1, 4);
const standingY = 2 + PLAYER.halfHeight;
const streak: Platform = { x0: 4, x1: 8, y: 5 };
const onStreakY = 5 + PLAYER.halfHeight;

describe('moveAndCollide', () => {
  it('lands on the floor and reports ground support', () => {
    const moved = moveAndCollide({ x: 5, y: standingY + 0.05, vx: 0, vy: -10 }, 0.01, [floor], []);
    expect(moved.y).toBeCloseTo(standingY);
    expect(moved.vy).toBe(0);
    expect(moved.support).toBe('ground');
  });

  it('stops at a wall', () => {
    const moved = moveAndCollide({ x: 9.6, y: standingY, vx: 20, vy: 0 }, 0.01, [floor, wall], []);
    expect(moved.x).toBeCloseTo(10 - PLAYER.halfWidth);
    expect(moved.vx).toBe(0);
  });

  it('stops at the nearer of two overlapping walls, whatever their order', () => {
    const a = rect(10, 2, 1, 4);
    const b = rect(9.9, 4, 1, 4);
    const start = { x: 9.55, y: 5, vx: 20, vy: 0 };
    for (const solids of [[a, b], [b, a]]) {
      const moved = moveAndCollide(start, 0.01, solids, []);
      expect(moved.x).toBeCloseTo(9.9 - PLAYER.halfWidth);
      expect(moved.vx).toBe(0);
    }
  });

  it('lands on the higher of two overlapping floors, whatever their order', () => {
    const low = rect(0, 0, 32, 2);
    const high = rect(4, 0, 2, 2.1);
    const start = { x: 5, y: 2.1 + PLAYER.halfHeight + 0.01, vx: 0, vy: -10 };
    for (const solids of [[low, high], [high, low]]) {
      const moved = moveAndCollide(start, 0.01, solids, []);
      expect(moved.y).toBeCloseTo(2.1 + PLAYER.halfHeight);
      expect(moved.support).toBe('ground');
    }
  });

  it('bumps its head on a ceiling', () => {
    const ceiling = rect(0, 6, 32, 1);
    const moved = moveAndCollide({ x: 5, y: 6 - PLAYER.halfHeight - 0.01, vx: 0, vy: 10 }, 0.01, [ceiling], []);
    expect(moved.vy).toBe(0);
    expect(moved.y).toBeCloseTo(6 - PLAYER.halfHeight);
  });

  it('keeps the runner inside the room edges', () => {
    const moved = moveAndCollide({ x: 0.31, y: standingY, vx: -20, vy: 0 }, 0.01, [floor], []);
    expect(moved.x).toBe(PLAYER.halfWidth);
    const far = moveAndCollide({ x: WORLD.width - 0.31, y: standingY, vx: 20, vy: 0 }, 0.01, [floor], []);
    expect(far.x).toBe(WORLD.width - PLAYER.halfWidth);
  });

  it('lands on a streak from above', () => {
    const moved = moveAndCollide({ x: 6, y: onStreakY + 0.05, vx: 0, vy: -10 }, 0.01, [], [streak]);
    expect(moved.y).toBeCloseTo(onStreakY);
    expect(moved.support).toBe('streak');
  });

  it('passes up through a streak from below', () => {
    const moved = moveAndCollide({ x: 6, y: onStreakY - 0.05, vx: 0, vy: 10 }, 0.01, [], [streak]);
    expect(moved.y).toBeGreaterThan(onStreakY - 0.05);
    expect(moved.support).toBe(null);
  });

  it('falls past the end of a streak', () => {
    const moved = moveAndCollide({ x: 8.4, y: onStreakY, vx: 0, vy: -1 }, 0.01, [], [streak]);
    expect(moved.support).toBe(null);
  });
});

describe('supportUnder', () => {
  it('prefers solid ground over a streak at the same height', () => {
    const sameHeight: Platform = { x0: 0, x1: 32, y: 2 };
    expect(supportUnder({ x: 5, y: standingY }, [floor], [sameHeight])).toBe('ground');
  });

  it('counts a streak under any part of the feet', () => {
    expect(supportUnder({ x: 8 + PLAYER.halfWidth - 0.01, y: onStreakY }, [], [streak])).toBe('streak');
    expect(supportUnder({ x: 8 + PLAYER.halfWidth, y: onStreakY }, [], [streak])).toBe(null);
  });
});
