import { describe, expect, it } from 'vitest';
import { endHeats, extendStreak, fullSpan, isCold, solidSpan, startStreak } from './streak';

const LIFE = 1;

/** A rightward dash from x 0 to 4 that took 0.2 s, starting at t = 10. */
const rightward = extendStreak(startStreak(0, 5, 10, LIFE), 4, 10.2);
/** The same dash going left, from x 4 to 0. */
const leftward = extendStreak(startStreak(4, 5, 10, LIFE), 0, 10.2);

describe('streak heat', () => {
  it('is white hot at the end the dash just reached', () => {
    expect(endHeats(rightward, 10.2)[1]).toBeCloseTo(1);
  });

  it('cools each end linearly from its own birth time', () => {
    const [start, end] = endHeats(rightward, 10.7);
    expect(start).toBeCloseTo(0.3);
    expect(end).toBeCloseTo(0.5);
  });

  it('goes negative once cold, so the renderer can find the exact zero point', () => {
    const [start, end] = endHeats(rightward, 11.1);
    expect(start).toBeCloseTo(-0.1);
    expect(end).toBeCloseTo(0.1);
  });

  it('cools by the lifetime the streak was born with', () => {
    const slow = extendStreak(startStreak(0, 5, 10, 2), 4, 10.2);
    expect(endHeats(slow, 11.2)[1]).toBeCloseTo(0.5);
    expect(isCold(rightward, 11.3)).toBe(true);
    expect(isCold(slow, 11.3)).toBe(false);
  });
});

describe('solid span', () => {
  it('is the whole streak while every point is still hot', () => {
    expect(solidSpan(rightward, 10.5)).toEqual(fullSpan(rightward));
  });

  it('shrinks from the end the dash started at', () => {
    const span = solidSpan(rightward, 11.1);
    expect(span?.x0).toBeCloseTo(2);
    expect(span?.x1).toBe(4);
  });

  it('shrinks toward the left for a leftward dash', () => {
    const span = solidSpan(leftward, 11.1);
    expect(span?.x0).toBe(0);
    expect(span?.x1).toBeCloseTo(2);
  });

  it('is gone at the exact instant the last point reaches zero heat', () => {
    expect(solidSpan(rightward, 11.2 - 1e-6)).not.toBeNull();
    expect(solidSpan(rightward, 11.2)).toBeNull();
    expect(isCold(rightward, 11.2)).toBe(true);
  });

  it('treats a zero-length streak as one point born at once', () => {
    const dot = startStreak(3, 5, 10, LIFE);
    expect(fullSpan(dot)).toEqual({ x0: 3, x1: 3 });
    expect(isCold(dot, 10.5)).toBe(false);
    expect(isCold(dot, 11)).toBe(true);
  });
});
