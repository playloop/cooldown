import { describe, expect, it } from 'vitest';
import { fragmentSource } from './shader-source';

describe('fragmentSource', () => {
  const source = fragmentSource();

  it('starts with the GLSL ES 3.00 version line, as WebGL2 requires', () => {
    expect(source.startsWith('#version 300 es\n')).toBe(true);
  });

  it('writes float constants as floats and array sizes as integers', () => {
    expect(source).toContain('#define WORLD_H 18.0');
    expect(source).toContain('#define MAX_SOLIDS 16\n');
  });

  it('includes every shader part exactly once', () => {
    for (const fn of ['float sdBox(', 'vec3 inferno(', 'float sdRunner(', 'void main()']) {
      expect(source.split(fn)).toHaveLength(2);
    }
  });
});
