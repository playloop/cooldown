import { PLAYER } from '../config';
import { boxAround, type Rect } from '../core/rect';
import type { Point } from '../world/room';

/** What the runner is standing on, if anything. */
export type Support = 'ground' | 'streak' | null;

export interface Player {
  /** Center of the body. */
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly facing: -1 | 1;
  readonly support: Support;
  /** Seconds left in which a jump still counts after leaving a ledge. */
  readonly coyote: number;
  /** Seconds left in which an early jump press will still fire. */
  readonly jumpBuffer: number;
  /** Seconds left in the current dash; 0 when not dashing. */
  readonly dashTime: number;
  /** One dash per trip through the air. Only solid ground gives it back, never a streak. */
  readonly canDash: boolean;
  /**
   * Set when the streak under the runner cooled away and dropped them. Cleared on
   * landing. A death while it is set is a `streak_cooled` death, not a spikes death.
   */
  readonly droppedByCooling: boolean;
}

export function spawnPlayer(feet: Point): Player {
  return {
    x: feet.x,
    y: feet.y + PLAYER.halfHeight,
    vx: 0,
    vy: 0,
    facing: 1,
    support: 'ground',
    coyote: 0,
    jumpBuffer: 0,
    dashTime: 0,
    canDash: true,
    droppedByCooling: false,
  };
}

export function bodyOf(p: Pick<Player, 'x' | 'y'>): Rect {
  return boxAround(p.x, p.y, PLAYER.halfWidth, PLAYER.halfHeight);
}

export function feetY(p: Pick<Player, 'y'>): number {
  return p.y - PLAYER.halfHeight;
}

export function isDashing(p: Player): boolean {
  return p.dashTime > 0;
}
