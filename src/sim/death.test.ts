import { describe, expect, it } from 'vitest';
import { PLAYER, SPIKES, WORLD } from '../config';
import type { Room } from '../world/room';
import { deathCheck, droppedByCooling, spikeHitbox } from './death';
import { spawnPlayer, type Player } from './player';
import { extendStreak, startStreak } from './streak';

const row = { x0: 10, x1: 14, baseY: 1 };
const room: Room = {
  name: 'test',
  solids: [],
  spikes: [row],
  spawn: { x: 1, y: 1 },
  exit: { x: 31, y: 1, w: 1, h: 4 },
};

/** A runner whose feet are at `feet`. */
function at(x: number, feet: number, extra: Partial<Player> = {}): Player {
  return { ...spawnPlayer({ x, y: feet }), support: null, ...extra };
}

describe('spikeHitbox', () => {
  it('covers the row but stops below the drawn tips', () => {
    expect(spikeHitbox(row)).toEqual({ x: 10, y: 1, w: 4, h: SPIKES.hitHeight });
    expect(SPIKES.hitHeight).toBeLessThan(SPIKES.height);
  });
});

describe('deathCheck', () => {
  it('kills on spikes with cause "spikes"', () => {
    expect(deathCheck(at(12, 1.2), room)).toBe('spikes');
  });

  it('spares a runner that only grazes above the deadly part', () => {
    expect(deathCheck(at(12, 1 + SPIKES.hitHeight + 0.01), room)).toBeNull();
  });

  it('blames the streak when a cooled streak dropped the runner', () => {
    expect(deathCheck(at(12, 1.2, { droppedByCooling: true }), room)).toBe('streak_cooled');
  });

  it('catches a fall out of the bottom of the room', () => {
    expect(deathCheck(at(5, WORLD.killY - 0.1), room)).toBe('spikes');
  });
});

describe('droppedByCooling', () => {
  // A streak at height 5 from x 4 to 8.
  const streak = extendStreak(startStreak(4, 5, 0, 1), 8, 0.2);
  const standing = at(6, 5, { support: 'streak' });

  it('is true when the streak cooled away under the feet', () => {
    expect(droppedByCooling(standing, at(6, 4.99, { vy: -0.25 }), [streak])).toBe(true);
  });

  it('is false when the runner walked off the end', () => {
    const offTheEnd = at(8 + PLAYER.halfWidth + 0.01, 4.99, { vy: -0.25 });
    expect(droppedByCooling(standing, offTheEnd, [streak])).toBe(false);
  });

  it('is false when the runner jumped', () => {
    expect(droppedByCooling(standing, at(6, 5.1, { vy: 12 }), [streak])).toBe(false);
  });

  it('is false when the runner was not on a streak', () => {
    const wasOnGround = { ...standing, support: 'ground' as const };
    expect(droppedByCooling(wasOnGround, at(6, 4.99, { vy: -0.25 }), [streak])).toBe(false);
  });
});
