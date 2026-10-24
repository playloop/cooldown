import { describe, expect, it } from 'vitest';
import { DEATH, TIMING } from '../config';
import { rect } from '../core/rect';
import type { GameEvent } from '../events/game-events';
import { holdRight, oneAttempt, play, type Script } from '../testing/play-script';
import { ROUTES } from '../testing/routes';
import type { Room } from '../world/room';
import { ROOMS } from '../world/rooms';
import { newGame, stepGame, type GameState } from './game';
import { NO_INPUT, type InputFrame } from './input-frame';

/** Two flat rooms with nothing in them, for testing the run itself. */
const flat: Room = {
  name: 'flat',
  solids: [rect(0, 0, 32, 2)],
  spikes: [],
  spawn: { x: 2, y: 2 },
  exit: rect(31, 2, 1, 4),
};
const twoRooms = [flat, { ...flat, name: 'second' }];

function step(state: GameState, input: Partial<InputFrame> = {}): { state: GameState; events: readonly GameEvent[] } {
  return stepGame(state, { ...NO_INPUT, ...input }, TIMING.step, twoRooms);
}

function stepFor(state: GameState, seconds: number, input: Partial<InputFrame> = {}): GameState {
  let s = state;
  for (let i = 0; i < Math.round(seconds / TIMING.step); i++) s = step(s, input).state;
  return s;
}

describe('the run', () => {
  it('waits for the first input before starting the timer', () => {
    const idle = stepFor(newGame(twoRooms), 1);
    expect(idle.started).toBe(false);
    expect(idle.runTime).toBe(0);
    expect(idle.clock).toBeCloseTo(1);
  });

  it('starts on the first input and reports the first room', () => {
    const { state, events } = step(newGame(twoRooms), { right: true });
    expect(state.started).toBe(true);
    expect(events).toEqual([{ type: 'run_started' }, { type: 'room_entered', room: 0, name: 'flat' }]);
  });

  it('moves to the next room through the exit', () => {
    const { state, events } = play(twoRooms, 0, () => ({ right: true }), oneAttempt);
    expect(events).toEqual([{ type: 'room_entered', room: 1, name: 'second' }]);
    expect(state.room).toBe(1);
    expect(state.player.x).toBe(flat.spawn.x);
  });

  it('finishes after the last room and stops the timer', () => {
    const { state, events } = play(twoRooms, 1, () => ({ right: true }), oneAttempt);
    expect(state.phase.kind).toBe('cleared');
    const done = events.find((e) => e.type === 'run_completed');
    expect(done).toEqual({ type: 'run_completed', runTime: state.runTime, deaths: 0 });
    expect(stepFor(state, 1).runTime).toBe(state.runTime);
  });

  it('starts a new run on a jump press once the cleared screen has settled', () => {
    const cleared = play(twoRooms, 1, () => ({ right: true }), oneAttempt).state;
    expect(step(cleared, { jumpPressed: true }).state.phase.kind).toBe('cleared');
    const settled = stepFor(cleared, 0.6);
    const restarted = step(settled, { jumpPressed: true }).state;
    expect(restarted.phase.kind).toBe('playing');
    expect(restarted.room).toBe(0);
    expect(restarted.started).toBe(false);
  });
});

describe('dying', () => {
  // Room 0 opens with a small spike pit; walking straight into it is a spikes death.
  const walkIn = () => play(ROOMS, 0, () => ({ right: true }), oneAttempt);

  it('reports where and why, counts it, and leaves a mark', () => {
    const { state, events } = walkIn();
    const died = events.find((e) => e.type === 'player_died');
    expect(died).toMatchObject({ type: 'player_died', room: 0, cause: 'spikes' });
    expect(state.phase.kind).toBe('dying');
    expect(state.deaths).toBe(1);
    expect(state.marks).toHaveLength(1);
  });

  it('respawns at the room start after the delay, with no streaks left', () => {
    const dead = walkIn().state;
    let s = dead;
    for (let i = 0; i < Math.ceil(DEATH.respawnDelay / TIMING.step) + 1; i++) {
      s = stepGame(s, NO_INPUT, TIMING.step, ROOMS).state;
    }
    expect(s.phase.kind).toBe('playing');
    expect(s.player.x).toBe(ROOMS[0]?.spawn.x);
    expect(s.streaks).toEqual([]);
  });

  it('blames the streak when you wait on it too long', () => {
    const { events } = play(ROOMS, 1, jumpDashThenLetGo(), oneAttempt);
    expect(events.find((e) => e.type === 'player_died')).toMatchObject({ cause: 'streak_cooled' });
  });

  it('blames the spikes when you jump off the streak and fall short', () => {
    // Room 1's route, tried on the wider gap in room 2: it falls short.
    const { events } = play(ROOMS, 2, holdRight(ROUTES['Stand on it']), oneAttempt);
    expect(events.find((e) => e.type === 'player_died')).toMatchObject({ cause: 'spikes' });
  });
});

describe('the dash', () => {
  it('is not given back by standing on a streak', () => {
    const onStreak = (s: GameState): boolean => s.player.support === 'streak' && s.player.dashTime === 0;
    const { state } = play(ROOMS, 1, jumpDashThenLetGo(), onStreak);
    expect(state.player.support).toBe('streak');
    expect(state.player.canDash).toBe(false);
    expect(state.streaks).toHaveLength(1);
  });

  it('is given back by landing on solid ground', () => {
    // Room 1 cleared: the runner dashed, then landed on the far ledge.
    const landed = (s: GameState): boolean => s.player.x > 21 && s.player.support === 'ground';
    const { state } = play(ROOMS, 1, holdRight(ROUTES['Stand on it']), landed);
    expect(state.player.canDash).toBe(true);
  });
});

/**
 * Room 1, the first streak: jump at the pit edge, dash as the jump peaks, then
 * let go of every key and stand on the streak.
 */
function jumpDashThenLetGo(): Script {
  let stage: 'run' | 'rise' | 'stand' = 'run';
  return (s) => {
    if (stage === 'run' && s.player.x >= 9.25) {
      stage = 'rise';
      return { right: true, jumpPressed: true, jumpHeld: true };
    }
    if (stage === 'rise' && s.player.vy < 0.5) {
      stage = 'stand';
      return { right: true, jumpHeld: true, dashPressed: true };
    }
    return stage === 'stand' ? {} : { right: true, jumpHeld: stage === 'rise' };
  };
}
