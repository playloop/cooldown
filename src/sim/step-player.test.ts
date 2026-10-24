import { describe, expect, it } from 'vitest';
import { TIMING } from '../config';
import { rect } from '../core/rect';
import type { Room } from '../world/room';
import { NO_INPUT } from './input-frame';
import { spawnPlayer, type Player } from './player';
import { stepPlayer } from './step-player';
import { extendStreak, startStreak } from './streak';

const dt = TIMING.step;
const room: Room = {
  name: 'test',
  solids: [rect(0, 0, 32, 2)],
  spikes: [],
  spawn: { x: 2, y: 2 },
  exit: rect(31, 2, 1, 4),
};
/** A streak at height 5 from x 4 to 8, laid at t = 0 with a 1 s lifetime. */
const streak = extendStreak(startStreak(4, 5, 0, 1), 8, 0.2);
const onStreak: Player = { ...spawnPlayer({ x: 6, y: 5 }), support: 'streak', canDash: false };

describe('stepPlayer', () => {
  it('gives the dash back on landing on solid ground', () => {
    const falling: Player = { ...spawnPlayer({ x: 6, y: 2.01 }), support: null, vy: -1, canDash: false };
    const { player } = stepPlayer(falling, NO_INPUT, dt, room, [], 0);
    expect(player.support).toBe('ground');
    expect(player.canDash).toBe(true);
  });

  it('keeps standing on a streak while it is hot, without giving the dash back', () => {
    const { player } = stepPlayer(onStreak, NO_INPUT, dt, room, [streak], 0.5);
    expect(player.support).toBe('streak');
    expect(player.canDash).toBe(false);
    expect(player.fallBlame).toBeNull();
  });

  it('blames the streak once it cools away under the feet', () => {
    const { player } = stepPlayer(onStreak, NO_INPUT, dt, room, [streak], 1.3);
    expect(player.support).toBeNull();
    expect(player.fallBlame).toBe('streak_cooled');
  });

  it('clears the blame on landing', () => {
    const blamed: Player = { ...spawnPlayer({ x: 6, y: 2.01 }), support: null, vy: -1, fallBlame: 'streak_cooled' };
    expect(stepPlayer(blamed, NO_INPUT, dt, room, [], 0).player.fallBlame).toBeNull();
  });

  it('reports the step a dash starts', () => {
    const airborne: Player = { ...spawnPlayer({ x: 6, y: 8 }), support: null };
    expect(stepPlayer(airborne, { ...NO_INPUT, dashPressed: true }, dt, room, [], 0).dashStarted).toBe(true);
  });
});
