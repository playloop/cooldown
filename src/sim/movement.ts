import { DASH, PLAYER } from '../config';
import { horizontalAxis, type InputFrame } from './input-frame';
import { isDashing, type Player } from './player';

export interface ControlResult {
  readonly player: Player;
  /** True on the step a dash begins, so the caller can lay down a new streak. */
  readonly dashStarted: boolean;
}

/** Moves `value` toward `target` by at most `maxDelta`. */
export function approach(value: number, target: number, maxDelta: number): number {
  if (value < target) return Math.min(value + maxDelta, target);
  return Math.max(value - maxDelta, target);
}

/**
 * Turns one step of input into new velocities and timers: run, jump, dash and
 * gravity. Positions do not change here; collision does that next.
 */
export function applyControls(p: Player, input: InputFrame, dt: number): ControlResult {
  const axis = horizontalAxis(input);
  const grounded = p.support !== null;
  const coyote = grounded ? PLAYER.coyoteTime : Math.max(0, p.coyote - dt);
  const jumpBuffer = input.jumpPressed ? PLAYER.jumpBufferTime : Math.max(0, p.jumpBuffer - dt);

  if (isDashing(p)) {
    // A dash is committed: straight line, fixed speed, no gravity. It stops dead
    // when it ends, so the runner lands standing on the end of its own streak.
    const dashTime = Math.max(0, p.dashTime - dt);
    const vx = dashTime > 0 ? p.facing * DASH.speed : 0;
    return { player: { ...p, vx, vy: 0, dashTime, coyote, jumpBuffer }, dashStarted: false };
  }

  const facing = axis === 0 ? p.facing : axis;

  if (input.dashPressed && p.canDash && !grounded) {
    return {
      player: {
        ...p,
        facing,
        vx: facing * DASH.speed,
        vy: 0,
        dashTime: DASH.duration,
        canDash: false,
        coyote: 0,
        jumpBuffer,
      },
      dashStarted: true,
    };
  }

  const accel = grounded ? PLAYER.groundAccel : PLAYER.airAccel;
  const vx = approach(p.vx, axis * PLAYER.runSpeed, accel * dt);

  const jumps = jumpBuffer > 0 && coyote > 0;
  let vy = jumps ? PLAYER.jumpSpeed : p.vy;
  if (!input.jumpHeld && vy > 0) {
    // Letting go early caps the rise, which is what makes a short hop possible.
    vy = Math.min(vy, PLAYER.jumpSpeed * PLAYER.jumpCutFactor);
  }
  vy = Math.max(vy - PLAYER.gravity * dt, -PLAYER.maxFallSpeed);

  return {
    player: {
      ...p,
      facing,
      vx,
      vy,
      coyote: jumps ? 0 : coyote,
      jumpBuffer: jumps ? 0 : jumpBuffer,
    },
    dashStarted: false,
  };
}
