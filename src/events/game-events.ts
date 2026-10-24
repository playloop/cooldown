import type { DeathCause } from '../sim/death';

/**
 * Everything the game reports about a run. The simulation returns these from
 * each step; it never knows who is listening. A sink maps these to whatever its
 * destination expects, so the game's own vocabulary stays in one place.
 */
export type GameEvent =
  | { readonly type: 'run_started' }
  | { readonly type: 'room_entered'; readonly room: number; readonly name: string }
  | {
      readonly type: 'player_died';
      readonly room: number;
      readonly cause: DeathCause;
      readonly x: number;
      readonly y: number;
      readonly runTime: number;
    }
  | { readonly type: 'run_completed'; readonly runTime: number; readonly deaths: number };
