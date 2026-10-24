import { describe, expect, it } from 'vitest';
import { readDebugOptions } from './debug';

describe('readDebugOptions', () => {
  it('is off by default', () => {
    expect(readDebugOptions('', 4)).toEqual({ enabled: false, startRoom: 0, nativeResolution: false });
  });

  it('starts in a chosen room only with debug on', () => {
    expect(readDebugOptions('?debug&room=2', 4)).toEqual({ enabled: true, startRoom: 2, nativeResolution: false });
    expect(readDebugOptions('?room=2', 4).startRoom).toBe(0);
  });

  it('ignores a room that does not exist', () => {
    expect(readDebugOptions('?debug&room=9', 4).startRoom).toBe(0);
    expect(readDebugOptions('?debug&room=x', 4).startRoom).toBe(0);
  });

  it('renders at native resolution only with debug on', () => {
    expect(readDebugOptions('?debug&native', 4).nativeResolution).toBe(true);
    expect(readDebugOptions('?native', 4).nativeResolution).toBe(false);
  });
});
