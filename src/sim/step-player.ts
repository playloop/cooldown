import type { Room } from '../world/room';
import type { Rect } from '../core/rect';
import { carveIce } from './ice';
import { isDashing } from './player';
import { moveAndCollide, moveDash } from './collision';
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
  ice: readonly Rect[] = [],
): ControlResult & { readonly ice: readonly Rect[] } {
  const { player: controlled, dashStarted } = applyControls(before, input, dt, room.diagonal);
  const hot = dashStarted || isDashing(before);
  const reachable = hot ? moveDash(controlled, dt, room.solids) : controlled;
  const remaining = hot ? carveIce(ice, before, reachable) : ice;
  const solids = [...room.solids, ...remaining];
  const dashMove = hot ? moveDash(controlled, dt, solids) : null;
  const moved = dashMove ?? moveAndCollide(controlled, dt, solids, platformsOf(streaks, now));
  const afterMove: Player = { ...controlled, ...moved, dashTime: dashMove?.blocked ? 0 : controlled.dashTime };
  const player: Player = {
    ...afterMove,
    canDash: afterMove.canDash || moved.support === 'ground',
    fallBlame: nextFallBlame(before, afterMove, streaks),
  };
  return { player, dashStarted, ice: remaining };
}

/** Landing clears the blame; an existing blame sticks; a cooled streak sets one. */
function nextFallBlame(before: Player, after: Player, streaks: readonly Streak[]): DeathCause | null {
  if (after.support !== null) return null;
  if (before.fallBlame !== null) return before.fallBlame;
  return droppedByCooling(before, after, streaks) ? 'streak_cooled' : null;
}
