import { SPIKES, STREAK, WORLD } from '../config';
import { LIMITS } from './scene-frame';
import colorGlsl from './shaders/color.glsl?raw';
import runnerGlsl from './shaders/runner.glsl?raw';
import sceneFrag from './shaders/scene.frag?raw';
import sdfGlsl from './shaders/sdf.glsl?raw';

export const VERTEX_SOURCE = `#version 300 es
in vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }
`;

/** Numbers the shader shares with the game, written in once from the config. */
const DEFINES: Readonly<Record<string, number>> = {
  WORLD_W: WORLD.width,
  WORLD_H: WORLD.height,
  SPIKE_H: SPIKES.height,
  STREAK_THICKNESS: STREAK.thickness,
  MAX_SOLIDS: LIMITS.solids,
  MAX_SPIKES: LIMITS.spikes,
  MAX_STREAKS: LIMITS.streaks,
  MAX_MARKS: LIMITS.marks,
};

/** GLSL wants 18.0, not 18, for a float constant; array sizes must stay integers. */
function glslLiteral(name: string, value: number): string {
  return name.startsWith('MAX_') || !Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function fragmentSource(): string {
  const defines = Object.entries(DEFINES)
    .map(([name, value]) => `#define ${name} ${glslLiteral(name, value)}`)
    .join('\n');
  return ['#version 300 es', 'precision highp float;', defines, sdfGlsl, colorGlsl, runnerGlsl, sceneFrag].join('\n');
}
