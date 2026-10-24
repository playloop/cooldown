import { describe, expect, it } from 'vitest';
import { DASH, PLAYER, TIMING } from '../config';
import { NO_INPUT, type InputFrame } from './input-frame';
import { applyControls, approach } from './movement';
import { spawnPlayer, type Player } from './player';

const dt = TIMING.step;
const standing = spawnPlayer({ x: 5, y: 2 });
const airborne: Player = { ...standing, support: null, vy: 0 };

function control(p: Player, input: Partial<InputFrame>): ReturnType<typeof applyControls> {
  return applyControls(p, { ...NO_INPUT, ...input }, dt);
}

describe('approach', () => {
  it('moves toward the target without overshooting', () => {
    expect(approach(0, 10, 3)).toBe(3);
    expect(approach(9, 10, 3)).toBe(10);
    expect(approach(0, -10, 3)).toBe(-3);
  });
});

describe('running', () => {
  it('accelerates toward run speed and turns to face the input', () => {
    const { player } = control(standing, { left: true });
    expect(player.vx).toBeCloseTo(-PLAYER.groundAccel * dt);
    expect(player.facing).toBe(-1);
  });

  it('keeps facing the same way with no input', () => {
    expect(control({ ...standing, facing: -1 }, {}).player.facing).toBe(-1);
  });
});

describe('jumping', () => {
  it('jumps from the ground at jump speed (less one step of gravity)', () => {
    const { player } = control(standing, { jumpPressed: true, jumpHeld: true });
    expect(player.vy).toBeCloseTo(PLAYER.jumpSpeed - PLAYER.gravity * dt);
  });

  it('allows a jump shortly after leaving a ledge (coyote time)', () => {
    const justLeft = { ...airborne, coyote: PLAYER.coyoteTime / 2 };
    expect(control(justLeft, { jumpPressed: true, jumpHeld: true }).player.vy).toBeGreaterThan(0);
  });

  it('does not jump in mid air once coyote time is spent', () => {
    expect(control(airborne, { jumpPressed: true, jumpHeld: true }).player.vy).toBeLessThan(0);
  });

  it('remembers an early press and fires it on landing (jump buffer)', () => {
    const pressedInAir = control(airborne, { jumpPressed: true, jumpHeld: true }).player;
    expect(pressedInAir.jumpBuffer).toBeGreaterThan(0);
    const landed = { ...pressedInAir, support: 'ground' as const, vy: 0 };
    expect(control(landed, { jumpHeld: true }).player.vy).toBeGreaterThan(0);
  });

  it('caps the rise when jump is let go early (short hop)', () => {
    const rising = { ...airborne, vy: PLAYER.jumpSpeed };
    const { player } = control(rising, { jumpHeld: false });
    expect(player.vy).toBeCloseTo(PLAYER.jumpSpeed * PLAYER.jumpCutFactor - PLAYER.gravity * dt);
  });

  it('never falls faster than the terminal speed', () => {
    const falling = { ...airborne, vy: -PLAYER.maxFallSpeed };
    expect(control(falling, {}).player.vy).toBe(-PLAYER.maxFallSpeed);
  });
});

describe('dashing', () => {
  it('only works in the air', () => {
    expect(control(standing, { dashPressed: true }).dashStarted).toBe(false);
    expect(control(airborne, { dashPressed: true }).dashStarted).toBe(true);
  });

  it('goes straight in the input direction at dash speed and spends the dash', () => {
    const { player } = control(airborne, { dashPressed: true, left: true });
    expect(player.vx).toBe(-DASH.speed);
    expect(player.vy).toBe(0);
    expect(player.canDash).toBe(false);
    expect(player.dashTime).toBe(DASH.duration);
  });

  it('cannot dash twice in one trip through the air', () => {
    const spent = { ...airborne, canDash: false };
    expect(control(spent, { dashPressed: true }).dashStarted).toBe(false);
  });

  it('ignores gravity and steering while the dash runs', () => {
    const dashing = { ...airborne, dashTime: DASH.duration, vx: DASH.speed };
    const { player } = control(dashing, { left: true, jumpPressed: true, jumpHeld: true });
    expect(player.vx).toBe(DASH.speed);
    expect(player.vy).toBe(0);
  });

  it('stops dead when it ends, so the runner stands on its streak', () => {
    const lastStep = { ...airborne, dashTime: dt / 2, vx: DASH.speed };
    const { player } = control(lastStep, {});
    expect(player.dashTime).toBe(0);
    expect(player.vx).toBe(0);
  });
});
