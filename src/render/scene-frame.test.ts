import { describe, expect, it } from 'vitest';
import { rect } from '../core/rect';
import { newGame, type GameState } from '../sim/game';
import { extendStreak, startStreak } from '../sim/streak';
import type { Room } from '../world/room';
import { ROOMS } from '../world/rooms';
import { LIMITS, SceneFrame } from './scene-frame';

const room: Room = {
  name: 'test',
  solids: [rect(0, 0, 10, 2)],
  spikes: [{ x0: 10, x1: 13, baseY: 1 }],
  spawn: { x: 2, y: 2 },
  exit: rect(31, 2, 1, 4),
};

function filled(state: GameState, r: Room = room): SceneFrame {
  const frame = new SceneFrame();
  frame.fill(state, r);
  return frame;
}

describe('SceneFrame', () => {
  it('packs boxes as center and half size', () => {
    const frame = filled(newGame([room]));
    expect(frame.solidCount).toBe(1);
    expect(Array.from(frame.solids.slice(0, 4))).toEqual([5, 1, 5, 1]);
    expect(Array.from(frame.exit)).toEqual([31.5, 4, 0.5, 2]);
  });

  it('splits each spike row into a whole number of teeth', () => {
    const frame = filled(newGame([room]));
    expect(Array.from(frame.spikes.slice(0, 4))).toEqual([10, 13, 1, 4]);
  });

  it('sends each streak with its heat at both ends', () => {
    const streak = extendStreak(startStreak(4, 5, 0, 1), 8, 0.2);
    const frame = filled({ ...newGame([room]), clock: 0.2, streaks: [streak] });
    expect(frame.streakCount).toBe(1);
    expect(Array.from(frame.streaks.slice(0, 3))).toEqual([4, 8, 5]);
    expect(frame.streakHeat[1]).toBeCloseTo(1);
    expect(frame.streakHeat[0]).toBeLessThan(1);
  });

  it('uses the lifetime each streak was born with, the same one the sim uses', () => {
    const slow = extendStreak(startStreak(4, 5, 0, 2), 8, 0.2);
    const frame = filled({ ...newGame([room]), clock: 1.2, streaks: [slow] });
    expect(frame.streakHeat[1]).toBeCloseTo(0.5);
  });

  it('draws only this room\'s deaths, newest warmest', () => {
    const marks = [
      { room: 0, x: 1, y: 1 },
      { room: 1, x: 9, y: 9 },
      { room: 0, x: 2, y: 2 },
    ];
    const frame = filled({ ...newGame([room]), marks });
    expect(frame.markCount).toBe(2);
    expect(frame.marks[0]).toBe(1);
    expect(frame.marks[4]).toBe(2);
    expect(frame.marks[6] ?? 0).toBeGreaterThan(frame.marks[2] ?? 0);
  });

  it('hides the runner and plays the burst while dying', () => {
    const dying: GameState = {
      ...newGame([room]),
      clock: 1.35,
      phase: { kind: 'dying', since: 1, at: { x: 11, y: 2 }, cause: 'spikes' },
    };
    const frame = filled(dying);
    expect(frame.playerVisible).toBe(0);
    expect(frame.burst[3]).toBe(1);
    expect(frame.burst[2]).toBeCloseTo(0.5);
  });

  it('fails fast on a room bigger than the shader can hold', () => {
    const crowded = { ...room, solids: Array.from({ length: LIMITS.solids + 1 }, () => rect(0, 0, 1, 1)) };
    expect(() => filled(newGame([crowded]), crowded)).toThrow(RangeError);
  });

  it('fits every real room', () => {
    for (const r of ROOMS) expect(() => filled(newGame([r]), r)).not.toThrow();
  });
});
