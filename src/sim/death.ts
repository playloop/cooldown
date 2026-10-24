import { SPIKES, WORLD } from '../config';
import { overlaps, rect, type Rect } from '../core/rect';
import type { Room, SpikeRow } from '../world/room';
import { CONTACT, footprintOver } from './collision';
import { bodyOf, feetY, type Player } from './player';
import { fullSpan, streakY, type Streak } from './streak';

/**
 * Why the runner died. These strings are the contract with anything that
 * records deaths, so a new way to die gets a new cause, never a reused one.
 */
export type DeathCause = 'spikes' | 'streak_cooled' | 'fell_out' | 'killed_by_seeker';

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
    return Math.abs(streakY(s, before.x) - feet) <= CONTACT && footprintOver(after.x, span.x0, span.x1);
  });
}

/** Something in a room that kills on contact. */
interface Hazard {
  /** The cause reported when nothing earlier is to blame. */
  readonly cause: DeathCause;
  /**
   * True for hazards you only reach by falling. If something dropped the
   * runner (a streak cooling under it), that takes the blame instead.
   */
  readonly reachedByFalling: boolean;
  readonly touches: (p: Player, room: Room) => boolean;
}

/** Checked in order; the first one touched is the one that killed. */
const HAZARDS: readonly Hazard[] = [
  {
    cause: 'spikes',
    reachedByFalling: true,
    touches: (p, room) => room.spikes.some((row) => overlaps(bodyOf(p), spikeHitbox(row))),
  },
  {
    // The room tests prove every floor is closed, so this only fires for a broken room.
    cause: 'fell_out',
    reachedByFalling: true,
    touches: (p) => feetY(p) < WORLD.killY,
  },
];

/** The cause of death if the runner is dying this step, otherwise null. */
export function deathCheck(p: Player, room: Room): DeathCause | null {
  const hazard = HAZARDS.find((h) => h.touches(p, room));
  if (hazard === undefined) return null;
  return hazard.reachedByFalling && p.fallBlame !== null ? p.fallBlame : hazard.cause;
}
