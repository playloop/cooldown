import { describe, expect, it } from 'vitest';
import { formatTime } from './format';

describe('formatTime', () => {
  it('shows minutes, seconds and hundredths', () => {
    expect(formatTime(0)).toBe('0:00.00');
    expect(formatTime(7.5)).toBe('0:07.50');
    expect(formatTime(83.456)).toBe('1:23.45');
  });

  it('never shows a negative time', () => {
    expect(formatTime(-3)).toBe('0:00.00');
  });
});
