import { PLAYER, REFILL, SEEKER, SPIKES, STREAK, WORLD } from '../config';
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
const FLOAT_DEFINES: Readonly<Record<string, number>> = {
  WORLD_W: WORLD.width,
  WORLD_H: WORLD.height,
  PLAYER_HALF_W: PLAYER.halfWidth,
  PLAYER_HALF_H: PLAYER.halfHeight,
  SPIKE_H: SPIKES.height,
  STREAK_THICKNESS: STREAK.thickness,
  REFILL_RADIUS: REFILL.radius,
  SEEKER_RADIUS: SEEKER.radius,
  SEEKER_WINDUP: SEEKER.windup,
};

/** Array sizes, which GLSL requires to be integer constants. */
const INT_DEFINES: Readonly<Record<string, number>> = {
  MAX_SOLIDS: LIMITS.solids,
  MAX_SPIKES: LIMITS.spikes,
  MAX_STREAKS: LIMITS.streaks,
  MAX_MARKS: LIMITS.marks,
  MAX_ICE: LIMITS.ice,
  MAX_PICKUPS: LIMITS.pickups,
  MAX_SEEKERS: LIMITS.seekers,
};

/** GLSL reads 18 as an int, so a float constant must be written 18.0. */
function floatLiteral(value: number): string {
  return Number.isInteger(value) ? value.toFixed(1) : String(value);
}

function intLiteral(value: number): string {
  if (!Number.isInteger(value)) throw new RangeError(`Shader array size must be an integer, got ${value}.`);
  return String(value);
}

function defines(values: Readonly<Record<string, number>>, literal: (value: number) => string): string[] {
  return Object.entries(values).map(([name, value]) => `#define ${name} ${literal(value)}`);
}

export function fragmentSource(): string {
  return [
    '#version 300 es',
    'precision highp float;',
    ...defines(FLOAT_DEFINES, floatLiteral),
    ...defines(INT_DEFINES, intLiteral),
    sdfGlsl,
    colorGlsl,
    runnerGlsl,
    sceneFrag,
  ].join('\n');
}
