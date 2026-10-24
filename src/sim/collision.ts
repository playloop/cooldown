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
  let x = b.x + b.vx * dt;
  let vx = b.vx;
  if (x < minX || x > maxX) {
    x = Math.min(Math.max(x, minX), maxX);
    vx = 0;
  }
  for (const s of solids) {
    if (!overlaps(bodyOf({ x, y: b.y }), s)) continue;
    x = vx > 0 ? s.x - PLAYER.halfWidth : right(s) + PLAYER.halfWidth;
    vx = 0;
  }
  return { ...b, x, vx };
}

function moveY(b: Body, dt: number, solids: readonly Rect[], platforms: readonly Platform[]): Body {
  const feetBefore = feetY(b);
  let y = b.y + b.vy * dt;
  let vy = b.vy;
  for (const s of solids) {
    if (!overlaps(bodyOf({ x: b.x, y }), s)) continue;
    y = vy <= 0 ? top(s) + PLAYER.halfHeight : s.y - PLAYER.halfHeight;
    vy = 0;
  }
  if (vy <= 0) {
    const feet = feetY({ y });
    for (const p of platforms) {
      const crossed = feetBefore >= p.y - CONTACT && feet < p.y;
      if (crossed && footprintOver(b.x, p.x0, p.x1)) {
        y = p.y + PLAYER.halfHeight;
        vy = 0;
      }
    }
  }
  return { ...b, y, vy };
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
    (s) => Math.abs(feet - top(s)) <= CONTACT && footprintOver(b.x, s.x, right(s)),
  );
  if (onGround) return 'ground';
  const onStreak = platforms.some(
    (p) => Math.abs(feet - p.y) <= CONTACT && footprintOver(b.x, p.x0, p.x1),
  );
  return onStreak ? 'streak' : null;
}
