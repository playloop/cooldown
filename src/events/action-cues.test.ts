import { describe, expect, it } from 'vitest';
import { TIMING } from '../config';
import { rect } from '../core/rect';
import { newGame, stepGame } from '../sim/game';
import { NO_INPUT } from '../sim/input-frame';
import { startStreak } from '../sim/streak';
import { holdRight } from '../testing/play-script';
import { AIR_ROUTES, ROUTES } from '../testing/routes';
import type { Room } from '../world/room';
import { ROOMS } from '../world/rooms';
import { actionCues, type SoundCue } from './action-cues';

const flat: Room = { name: 'flat', solids: [rect(0, 0, 32, 2)], spikes: [],
  spawn: { x: 2, y: 2 }, exit: rect(31, 2, 1, 4) };
const dt = TIMING.step;
const none = { dashStarted: false, jumpStarted: false };

describe('local action feedback', () => {
  it('sounds successful jumps/dashes only, including buffered jumps', () => {
    const initial = newGame([flat]);
    expect(stepGame(initial, { ...NO_INPUT, dashPressed: true }, dt, [flat]).cues).toEqual([]);
    const jumped = stepGame(initial, { ...NO_INPUT, jumpPressed: true, jumpHeld: true }, dt, [flat]);
    expect(jumped.cues).toEqual(['jump']);
    const invalid = stepGame(jumped.state, { ...NO_INPUT, jumpPressed: true, jumpHeld: true }, dt, [flat]);
    expect(invalid.cues).toEqual([]);
    const dashed = stepGame(invalid.state, { ...NO_INPUT, dashPressed: true }, dt, [flat]);
    expect(dashed.cues).toEqual(['dash']);
    expect(stepGame(dashed.state, { ...NO_INPUT, dashPressed: true }, dt, [flat]).cues).toEqual([]);
    const buffered = { ...initial, player: { ...initial.player, jumpBuffer: 0.1 } };
    expect(stepGame(buffered, NO_INPUT, dt, [flat]).cues).toEqual(['jump']);
  });

  it('does not make clear sounds when starting or death sounds during respawn', () => {
    expect(stepGame(newGame([flat]), { ...NO_INPUT, right: true }, dt, [flat]).cues).toEqual([]);
    let state = newGame(ROOMS);
    let died = false;
    for (let i = 0; i < 600; i++) {
      const result = stepGame(state, { ...NO_INPUT, right: true }, dt, ROOMS);
      state = result.state;
      if (result.cues.includes('death')) { died = true; break; }
    }
    expect(died).toBe(true);
    expect(stepGame(state, NO_INPUT, dt, ROOMS).cues).toEqual([]);
  });

  it('warns once near cooling, rather than every fixed step', () => {
    const initial = newGame([flat]);
    const streaks = [startStreak(3, 4, 0, 1)];
    const before = { ...initial, clock: 0.75, streaks };
    expect(actionCues(before, before, none, dt)).toEqual(['streak-cool']);
    const later = { ...before, clock: 0.75 + dt };
    expect(actionCues(later, later, none, dt)).toEqual([]);
  });

  it('covers ice, pickups, seekers and completion through real room routes', () => {
    const cues = new Set<SoundCue>();
    for (const routes of [ROUTES, AIR_ROUTES]) {
      ROOMS.forEach((room, index) => {
        const script = holdRight(routes[room.name as keyof typeof routes]);
        let state = { ...newGame(ROOMS, index), started: true };
        for (let i = 0; i < 2400; i++) {
          const result = stepGame(state, { ...NO_INPUT, ...script(state) }, dt, ROOMS);
          result.cues.forEach((cue) => cues.add(cue));
          state = result.state;
          if (state.phase.kind !== 'playing' || state.room !== index) break;
        }
      });
    }
    for (const cue of ['jump', 'dash', 'ice', 'refill', 'streak-cool', 'seeker-lock',
      'seeker-charge', 'room-clear', 'run-clear']) expect(cues.has(cue as SoundCue), cue).toBe(true);
  });
});
