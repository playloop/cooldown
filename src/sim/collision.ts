import { PLAYER, WORLD } from '../config';
import { expanded, segmentHit } from '../core/segment';
import { overlaps, right, spansOverlap, top, type Rect } from '../core/rect';
import { bodyOf, feetY, type Support } from './player';

/** A surface you can land on from above and pass through from below (a streak). */
export interface Platform {
  readonly x0: number;
  readonly x1: number;
  readonly y: number;
  readonly endY?: number;
}

/** Height at the foot's center, clamped to the actual ends of a one-way ramp. */
export function platformY(p: Platform, x: number): number {
  const t = p.x1 - p.x0 < CONTACT ? 1 : Math.max(0, Math.min(1, (x - p.x0) / (p.x1 - p.x0)));
  return p.y + ((p.endY ?? p.y) - p.y) * t;
}

export interface Body {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
}

export interface Moved extends Body {
  readonly support: Support;
}

/** Contact tolerance. Snapping leaves feet exactly on a surface, give or take float error. */
export const CONTACT = 1e-3;

/**
 * Moves a body by its velocity for one step and pushes it out of anything solid.
 * X then Y, one axis at a time, which is the classic approach for box platformers.
 * Speeds stay well under one solid's thickness per step, so nothing tunnels.
 */
export function moveAndCollide(
  b: Body,
  dt: number,
  solids: readonly Rect[],
  platforms: readonly Platform[],
): Moved {
  const afterX = moveX(b, dt, solids);
  const afterY = moveY(afterX, dt, solids, platforms, b.x);
  return { ...afterY, support: supportUnder(afterY, solids, platforms) };
}

function moveX(b: Body, dt: number, solids: readonly Rect[]): Body {
  const minX = PLAYER.halfWidth;
  const maxX = WORLD.width - PLAYER.halfWidth;
  const target = b.x + b.vx * dt;
  let x = Math.min(Math.max(target, minX), maxX);
  let blocked = x !== target;
  // Every solid the target overlaps pushes back against the direction of travel.
  // Taking the closest stop means the order of `solids` never changes the result.
  const body = bodyOf({ x, y: b.y });
  for (const solid of solids) {
    if (b.vx === 0 || !overlaps(body, solid)) continue;
    x = b.vx > 0 ? Math.min(x, solid.x - PLAYER.halfWidth) : Math.max(x, right(solid) + PLAYER.halfWidth);
    blocked = true;
  }
  return { ...b, x, vx: blocked ? 0 : b.vx };
}

function moveY(b: Body, dt: number, solids: readonly Rect[], platforms: readonly Platform[], previousX: number): Body {
  const feetBefore = feetY(b);
  const falling = b.vy <= 0;
  let y = b.y + b.vy * dt;
  let blocked = false;
  // Same rule as moveX: direction from the velocity before the step, closest stop wins.
  const body = bodyOf({ x: b.x, y });
  for (const solid of solids) {
    if (!overlaps(body, solid)) continue;
    y = falling ? Math.max(y, top(solid) + PLAYER.halfHeight) : Math.min(y, solid.y - PLAYER.halfHeight);
    blocked = true;
  }
  if (falling) {
    const feet = feetY({ y });
    for (const platform of platforms) {
      const surface = platformY(platform, b.x);
      const previousSurface = platformY(platform, previousX);
      const following = Math.abs(feetBefore - previousSurface) <= CONTACT && footprintOver(previousX, platform.x0, platform.x1);
      const crossed = feetBefore >= previousSurface - CONTACT && feet < surface;
      if ((crossed || following) && footprintOver(b.x, platform.x0, platform.x1)) {
        const candidate = surface + PLAYER.halfHeight;
        if (solids.some((solid) => overlaps(bodyOf({ x: b.x, y: candidate }), solid))) continue;
        y = following && !blocked ? candidate : Math.max(y, candidate);
        blocked = true;
      }
    }
  }
  return { ...b, y, vy: blocked ? 0 : b.vy };
}

/** True when a runner centered at x has some of its width over the range [x0, x1]. */
export function footprintOver(x: number, x0: number, x1: number): boolean {
  return spansOverlap(x - PLAYER.halfWidth, x + PLAYER.halfWidth, x0, x1);
}

/** What is directly under the feet right now. Solid ground wins over a streak. */
export function supportUnder(
  b: Pick<Body, 'x' | 'y'>,
  solids: readonly Rect[],
  platforms: readonly Platform[],
): Support {
  const feet = feetY(b);
  const onGround = solids.some(
    (solid) => Math.abs(feet - top(solid)) <= CONTACT && footprintOver(b.x, solid.x, right(solid)),
  );
  if (onGround) return 'ground';
  const onStreak = platforms.some(
    (platform) => Math.abs(feet - platformY(platform, b.x)) <= CONTACT && footprintOver(b.x, platform.x0, platform.x1),
  );
  return onStreak ? 'streak' : null;
}

/** A dash follows one straight segment and ends at its first solid contact. */
export function moveDash(b: Body, dt: number, solids: readonly Rect[]): Moved & { blocked: boolean } {
  const dx = b.vx * dt, dy = b.vy * dt;
  const end = { x: b.x + dx, y: b.y + dy };
  let fraction = 1;
  for (const solid of solids) {
    const contact = segmentHit(b, end, expanded(solid, PLAYER.halfWidth, PLAYER.halfHeight));
    if (contact === null) continue;
    // Touching a surface while moving away or parallel is not an impact.
    if (contact === 0 && !overlaps(bodyOf({ x: b.x + dx * 1e-4, y: b.y + dy * 1e-4 }), solid)) continue;
    fraction = Math.min(fraction, contact);
  }
  if (end.x < PLAYER.halfWidth && dx < 0) fraction = Math.min(fraction, (PLAYER.halfWidth - b.x) / dx);
  if (end.x > WORLD.width - PLAYER.halfWidth && dx > 0) fraction = Math.min(fraction, (WORLD.width - PLAYER.halfWidth - b.x) / dx);
  const blocked = fraction < 1;
  const moved = { x: b.x + dx * fraction, y: b.y + dy * fraction,
    vx: blocked ? 0 : b.vx, vy: blocked ? 0 : b.vy };
  return { ...moved, blocked, support: supportUnder(moved, solids, []) };
}
