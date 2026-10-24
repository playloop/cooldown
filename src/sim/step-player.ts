import type { Room } from '../world/room';
import { moveAndCollide } from './collision';
import { droppedByCooling, type DeathCause } from './death';
import type { InputFrame } from './input-frame';
import { applyControls, type ControlResult } from './movement';
import type { Player } from './player';
import type { Streak } from './streak';
import { platformsOf } from './streak-list';

/**
 * Moves the runner through one step: controls, then collision against the
 * room and the still-solid streaks, then what landing (or not landing) means
 * for the dash and for who to blame if this turns into a fatal fall.
 */
export function stepPlayer(
  before: Player,
  input: InputFrame,
  dt: number,
  room: Room,
  streaks: readonly Streak[],
  now: number,
): ControlResult {
  const { player: controlled, dashStarted } = applyControls(before, input, dt);
  const moved = moveAndCollide(controlled, dt, room.solids, platformsOf(streaks, now));
  const afterMove: Player = { ...controlled, ...moved };
  const player: Player = {
    ...afterMove,
    canDash: afterMove.canDash || moved.support === 'ground',
    fallBlame: nextFallBlame(before, afterMove, streaks),
  };
  return { player, dashStarted };
}

/** Landing clears the blame; an existing blame sticks; a cooled streak sets one. */
function nextFallBlame(before: Player, after: Player, streaks: readonly Streak[]): DeathCause | null {
  if (after.support !== null) return null;
  if (before.fallBlame !== null) return before.fallBlame;
  return droppedByCooling(before, after, streaks) ? 'streak_cooled' : null;
}
