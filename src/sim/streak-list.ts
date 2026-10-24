import { STREAK } from '../config';
import type { Platform } from './collision';
import { feetY, isDashing, type Player } from './player';
import { extendStreak, isCold, solidSpan, startStreak, streakY, type Streak } from './streak';

/**
 * Keeps the list of live streaks in step with the runner: a new streak when a
 * dash starts, the newest one stretched while the dash runs, cold ones dropped.
 * `before` is the runner at the start of the step and `after` at the end.
 * `lifetime` is stamped on any streak born this step.
 */
export function updateStreaks(
  streaks: readonly Streak[],
  before: Player,
  after: Player,
  dashStarted: boolean,
  now: number,
  lifetime: number,
): readonly Streak[] {
  let next = dashStarted ? [...streaks, startStreak(before.x, feetY(before), now, lifetime)] : streaks;
  if (dashStarted || isDashing(before)) next = stretchNewest(next, after.x, feetY(after), now);
  return next.filter((streak) => !isCold(streak, now)).slice(-STREAK.maxAlive);
}

function stretchNewest(streaks: readonly Streak[], x: number, y: number, now: number): readonly Streak[] {
  const newest = streaks.at(-1);
  if (newest === undefined) return streaks;
  return [...streaks.slice(0, -1), extendStreak(newest, x, now, y)];
}

/** The still-solid part of every streak, as surfaces the runner can stand on. */
export function platformsOf(streaks: readonly Streak[], now: number): readonly Platform[] {
  const out: Platform[] = [];
  for (const streak of streaks) {
    const span = solidSpan(streak, now);
    if (span !== null) out.push({ ...span, y: streakY(streak, span.x0), endY: streakY(streak, span.x1) });
  }
  return out;
}
