import { describe, expect, it } from 'vitest';
import { endHeats, extendStreak, fullSpan, heatAt, isCold, solidSpan, startStreak } from './streak';

const LIFE = 1;

/** A rightward dash from x 0 to 4 that took 0.2 s, starting at t = 10. */
const rightward = extendStreak(startStreak(0, 5, 10), 4, 10.2);
/** The same dash going left, from x 4 to 0. */
const leftward = extendStreak(startStreak(4, 5, 10), 0, 10.2);

describe('streak heat', () => {
  it('is white hot where the dash just passed', () => {
    expect(heatAt(rightward, 4, 10.2, LIFE)).toBeCloseTo(1);
  });

  it('cools each point linearly from its own birth time', () => {
    expect(heatAt(rightward, 0, 10.5, LIFE)).toBeCloseTo(0.5);
    expect(heatAt(rightward, 4, 10.7, LIFE)).toBeCloseTo(0.5);
    expect(heatAt(rightward, 2, 10.6, LIFE)).toBeCloseTo(0.5);
  });

  it('is zero outside the streak and never negative', () => {
    expect(heatAt(rightward, -0.1, 10.2, LIFE)).toBe(0);
    expect(heatAt(rightward, 4.1, 10.2, LIFE)).toBe(0);
    expect(heatAt(rightward, 0, 99, LIFE)).toBe(0);
  });

  it('gives the renderer unclamped end heats it can interpolate', () => {
    const [start, end] = endHeats(rightward, 11.1, LIFE);
    expect(start).toBeCloseTo(-0.1);
    expect(end).toBeCloseTo(0.1);
  });
});

describe('solid span', () => {
  it('is the whole streak while every point is still hot', () => {
    expect(solidSpan(rightward, 10.5, LIFE)).toEqual(fullSpan(rightward));
  });

  it('shrinks from the end the dash started at', () => {
    const span = solidSpan(rightward, 11.1, LIFE);
    expect(span?.x0).toBeCloseTo(2);
    expect(span?.x1).toBe(4);
  });

  it('shrinks toward the left for a leftward dash', () => {
    const span = solidSpan(leftward, 11.1, LIFE);
    expect(span?.x0).toBe(0);
    expect(span?.x1).toBeCloseTo(2);
  });

  it('is gone at the exact instant the last point reaches zero heat', () => {
    expect(solidSpan(rightward, 11.2 - 1e-6, LIFE)).not.toBeNull();
    expect(solidSpan(rightward, 11.2, LIFE)).toBeNull();
    expect(isCold(rightward, 11.2, LIFE)).toBe(true);
  });

  it('treats a zero-length streak as one point born at once', () => {
    const dot = startStreak(3, 5, 10);
    expect(fullSpan(dot)).toEqual({ x0: 3, x1: 3 });
    expect(isCold(dot, 10.5, LIFE)).toBe(false);
    expect(isCold(dot, 11, LIFE)).toBe(true);
  });
});
