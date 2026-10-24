/**
 * A streak is the white-hot line an air dash leaves behind. Each point along it
 * is born when the dash passes over it, then cools for `lifetime` seconds. A
 * point is solid while its heat is above zero; at the instant it reaches zero it
 * is gone. Because the dash moves at a constant speed, birth time is linear in x,
 * so the streak always cools from the end the dash started at.
 */
export interface Streak {
  /** Where the dash began. */
  readonly startX: number;
  /** Where the dash is now, or where it ended. May be left of startX. */
  readonly endX: number;
  /** The standing surface: the runner's feet height when the dash began. */
  readonly y: number;
  /** Birth time of the point at startX. */
  readonly startTime: number;
  /** Birth time of the point at endX. */
  readonly endTime: number;
}

export interface Span {
  readonly x0: number;
  readonly x1: number;
}

export function startStreak(x: number, y: number, now: number): Streak {
  return { startX: x, endX: x, y, startTime: now, endTime: now };
}

/** The dash moved on: the streak now reaches `x`, and that point is born `now`. */
export function extendStreak(s: Streak, x: number, now: number): Streak {
  return { ...s, endX: x, endTime: now };
}

/** Heat of the point at x, before clamping. Positive means still solid. */
function rawHeatAt(s: Streak, x: number, now: number, lifetime: number): number {
  const length = s.endX - s.startX;
  const along = length === 0 ? 1 : (x - s.startX) / length;
  const born = s.startTime + (s.endTime - s.startTime) * along;
  return 1 - (now - born) / lifetime;
}

/** Heat of the point at x, from 1 (just made) to 0 (cold). Zero outside the streak. */
export function heatAt(s: Streak, x: number, now: number, lifetime: number): number {
  const span = fullSpan(s);
  if (x < span.x0 || x > span.x1) return 0;
  return Math.min(Math.max(rawHeatAt(s, x, now, lifetime), 0), 1);
}

/**
 * Unclamped heat at both ends, for the renderer. Heat is linear along the
 * streak, so these two numbers let the shader rebuild every point exactly.
 */
export function endHeats(s: Streak, now: number, lifetime: number): readonly [number, number] {
  return [rawHeatAt(s, s.startX, now, lifetime), rawHeatAt(s, s.endX, now, lifetime)];
}

/** Everything the dash has laid down, hot or cold, left to right. */
export function fullSpan(s: Streak): Span {
  return { x0: Math.min(s.startX, s.endX), x1: Math.max(s.startX, s.endX) };
}

/** The part that is still solid, left to right, or null once it has all cooled. */
export function solidSpan(s: Streak, now: number, lifetime: number): Span | null {
  const [startHeat, endHeat] = endHeats(s, now, lifetime);
  if (endHeat <= 0) return null;
  if (startHeat > 0) return fullSpan(s);
  // Solid from the point whose heat is exactly zero, out to the end.
  const zeroAt = s.startX + (s.endX - s.startX) * (startHeat / (startHeat - endHeat));
  return { x0: Math.min(zeroAt, s.endX), x1: Math.max(zeroAt, s.endX) };
}

export function isCold(s: Streak, now: number, lifetime: number): boolean {
  return solidSpan(s, now, lifetime) === null;
}
