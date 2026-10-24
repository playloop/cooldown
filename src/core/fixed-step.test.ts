import { describe, expect, it } from 'vitest';
import { FixedStep } from './fixed-step';

describe('FixedStep', () => {
  it('turns frame time into whole steps and carries the rest', () => {
    const loop = new FixedStep(0.01, 1);
    expect(loop.advance(0.025)).toBe(2);
    expect(loop.advance(0.005)).toBe(1);
  });

  it('counts an exact multiple as exact despite float error', () => {
    const loop = new FixedStep(1 / 120, 1);
    expect(loop.advance(2 / 120)).toBe(2);
  });

  it('never replays more than the frame cap after a stall', () => {
    const loop = new FixedStep(0.01, 0.25);
    expect(loop.advance(10)).toBe(25);
  });

  it('ignores a negative frame time', () => {
    expect(new FixedStep(0.01, 1).advance(-1)).toBe(0);
  });
});
