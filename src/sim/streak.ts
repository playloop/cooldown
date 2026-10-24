/**
 * A streak is the white-hot line an air dash leaves behind. Each point along it
 * is born when the dash passes over it, then cools for the streak's own
 * `lifetime` seconds, fixed when the streak is made. A
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
  readonly endY: number;
  /** Birth time of the point at startX. */
  readonly startTime: number;
  /** Birth time of the point at endX. */
  readonly endTime: number;
  /** Seconds each point stays solid. Carried by the streak so sim and renderer always agree. */
  readonly lifetime: number;
}

export interface Span {
  readonly x0: number;
  readonly x1: number;
}

export function startStreak(x: number, y: number, now: number, lifetime: number): Streak {
  return { startX: x, endX: x, y, endY: y, startTime: now, endTime: now, lifetime };
}

/** The dash moved on: the streak now reaches `x`, and that point is born `now`. */
export function extendStreak(s: Streak, x: number, now: number, y = s.endY): Streak {
  return { ...s, endX: x, endY: y, endTime: now };
}

export function streakY(s: Streak, x: number): number {
  const dx = s.endX - s.startX;
  const t = Math.abs(dx) < 1e-6 ? 1 : Math.max(0, Math.min(1, (x - s.startX) / dx));
  return s.y + (s.endY - s.y) * t;
}

/** Heat of a point born at `born`: 1 when new, 0 when cold, negative after. */
function heatOf(s: Streak, born: number, now: number): number {
  return 1 - (now - born) / s.lifetime;
}

/**
 * Unclamped heat at both ends, for the renderer. Heat is linear along the
 * streak, so these two numbers let the shader rebuild every point exactly.
 */
export function endHeats(s: Streak, now: number): readonly [number, number] {
  return [heatOf(s, s.startTime, now), heatOf(s, s.endTime, now)];
}

/** Everything the dash has laid down, hot or cold, left to right. */
export function fullSpan(s: Streak): Span {
  return { x0: Math.min(s.startX, s.endX), x1: Math.max(s.startX, s.endX) };
}

/** The part that is still solid, left to right, or null once it has all cooled. */
export function solidSpan(s: Streak, now: number): Span | null {
  const [startHeat, endHeat] = endHeats(s, now);
  if (endHeat <= 0) return null;
  if (startHeat > 0) return fullSpan(s);
  // Solid from the point whose heat is exactly zero, out to the end.
  const zeroAt = s.startX + (s.endX - s.startX) * (startHeat / (startHeat - endHeat));
  return { x0: Math.min(zeroAt, s.endX), x1: Math.max(zeroAt, s.endX) };
}

export function isCold(s: Streak, now: number): boolean {
  return solidSpan(s, now) === null;
}
