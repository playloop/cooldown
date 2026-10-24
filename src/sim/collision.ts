import { PLAYER, WORLD } from '../config';
import { overlaps, right, spansOverlap, top, type Rect } from '../core/rect';
import { bodyOf, feetY, type Support } from './player';

/** A surface you can land on from above and pass through from below (a streak). */
export interface Platform {
  readonly x0: number;
  readonly x1: number;
  readonly y: number;
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
  const afterY = moveY(afterX, dt, solids, platforms);
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

function moveY(b: Body, dt: number, solids: readonly Rect[], platforms: readonly Platform[]): Body {
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
      const crossed = feetBefore >= platform.y - CONTACT && feet < platform.y;
      if (crossed && footprintOver(b.x, platform.x0, platform.x1)) {
        y = Math.max(y, platform.y + PLAYER.halfHeight);
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
    (platform) => Math.abs(feet - platform.y) <= CONTACT && footprintOver(b.x, platform.x0, platform.x1),
  );
  return onStreak ? 'streak' : null;
}
