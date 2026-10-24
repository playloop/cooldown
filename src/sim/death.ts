import { SPIKES, WORLD } from '../config';
import { overlaps, rect, type Rect } from '../core/rect';
import type { Room, SpikeRow } from '../world/room';
import { CONTACT, footprintOver } from './collision';
import { bodyOf, feetY, type Player } from './player';
import { fullSpan, type Streak } from './streak';

/**
 * Why the runner died. These strings are the contract with anything that
 * records deaths, so a new way to die gets a new cause, never a reused one.
 */
export type DeathCause = 'spikes' | 'streak_cooled';

/** The deadly part of a spike row: full width, but shorter than the drawn spikes. */
export function spikeHitbox(row: SpikeRow): Rect {
  return rect(row.x0, row.baseY, row.x1 - row.x0, SPIKES.hitHeight);
}

/**
 * True when the runner was standing on a streak last step and is now falling
 * because that streak cooled away under it, as opposed to walking or jumping off.
 * The test: the streak as laid down would still be under the feet, but no part
 * of it there is solid any more.
 */
export function droppedByCooling(
  before: Player,
  after: Player,
  streaks: readonly Streak[],
): boolean {
  if (before.support !== 'streak' || after.support !== null || after.vy > 0) return false;
  const feet = feetY(before);
  return streaks.some((s) => {
    const span = fullSpan(s);
    return Math.abs(s.y - feet) <= CONTACT && footprintOver(after.x, span.x0, span.x1);
  });
}

/** The cause of death if the runner is dying this step, otherwise null. */
export function deathCheck(p: Player, room: Room): DeathCause | null {
  const body = bodyOf(p);
  const hitSpikes = room.spikes.some((row) => overlaps(body, spikeHitbox(row)));
  // A safety net only: the room tests prove every pit is lined with spikes.
  const fellOut = feetY(p) < WORLD.killY;
  if (!hitSpikes && !fellOut) return null;
  return p.droppedByCooling ? 'streak_cooled' : 'spikes';
}
