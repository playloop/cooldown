import { DASH, TIMING } from '../config';
import type { GameEvent } from '../events/game-events';
import { newGame, stepGame, type GameState } from '../sim/game';
import { NO_INPUT, type InputFrame } from '../sim/input-frame';
import type { Room } from '../world/room';

/** Decides the input for each step from the current state. */
export type Script = (state: GameState) => Partial<InputFrame>;

export interface PlayResult {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
}

export type StopWhen = (state: GameState, events: readonly GameEvent[]) => boolean;

/** Stops at the first death, room change or finish: one attempt at one room. */
export const oneAttempt: StopWhen = (_state, events) =>
  events.some((e) => e.type === 'player_died' || e.type === 'room_entered' || e.type === 'run_completed');

/**
 * Plays the real simulation at the real step with a scripted player, the way a
 * person at the keyboard would. Used to prove rooms can be cleared.
 */
export function play(
  rooms: readonly Room[],
  startRoom: number,
  script: Script,
  stopWhen: StopWhen,
  maxSeconds = 20,
): PlayResult {
  // Start already running, so the run_started and first room_entered events do not end the attempt.
  let state: GameState = { ...newGame(rooms, startRoom), started: true };
  const events: GameEvent[] = [];
  const steps = Math.ceil(maxSeconds / TIMING.step);
  for (let i = 0; i < steps; i++) {
    const result = stepGame(state, { ...NO_INPUT, ...script(state) }, TIMING.step, rooms);
    state = result.state;
    events.push(...result.events);
    if (stopWhen(state, result.events)) break;
  }
  return { state, events };
}

/** One scripted button press, fired the first step `when` is true. */
export interface Move {
  readonly press: 'jump' | 'dash';
  readonly aim?: 'up' | 'down';
  readonly when: (state: GameState, sincePrevious: number) => boolean;
}

/** Fires once the runner reaches x. */
export const atX =
  (x: number): Move['when'] =>
  (s) =>
    s.player.x >= x;

/** Fires this many seconds after the previous move. */
export const after =
  (seconds: number): Move['when'] =>
  (_s, since) =>
    since >= seconds - 1e-9;

/** Fires this many seconds after the dash pressed by the previous move has finished. */
export const afterDash =
  (seconds: number): Move['when'] =>
  (s, since) =>
    s.player.dashTime === 0 && since >= DASH.duration + seconds - 1e-9;

/**
 * The simplest player: holds right the whole time, keeps jump held once it has
 * jumped (full-height jumps), and presses each move in order.
 */
export function holdRight(moves: readonly Move[]): Script {
  let next = 0;
  let lastAt = 0;
  let jumped = false;
  return (s) => {
    const move = moves[next];
    const fire = move !== undefined && move.when(s, s.clock - lastAt);
    if (fire) {
      next++;
      lastAt = s.clock;
      if (move.press === 'jump') jumped = true;
    }
    return {
      right: true,
      up: fire && move.aim === 'up',
      down: fire && move.aim === 'down',
      jumpHeld: jumped,
      jumpPressed: fire && move.press === 'jump',
      dashPressed: fire && move.press === 'dash',
    };
  };
}
