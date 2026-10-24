import { bindFullscreenTriangle, createProgram, uniformLocations } from './gl-program';
import type { SceneFrame } from './scene-frame';
import { fragmentSource, VERTEX_SOURCE } from './shader-source';

const UNIFORMS = [
  'uRes',
  'uTime',
  'uRoomSeed',
  'uSolids',
  'uSolidCount',
  'uIce', 'uIceCount', 'uPickups', 'uPickupCount', 'uSeekers', 'uTargets', 'uSeekerCount', 'uDashReady',
  'uSpikes',
  'uSpikeCount',
  'uStreaks',
  'uStreakHeat',
  'uStreakCount',
  'uMarks',
  'uMarkCount',
  'uMarkScale',
  'uPlayer',
  'uPlayerVisible',
  'uStride',
  'uBurst',
  'uExit',
] as const;

/**
 * Draws a SceneFrame with one fullscreen fragment shader. It renders at the
 * canvas's own size (fixed in index.html; `?debug&native` sizes it to the screen
 * for recording) and lets CSS scale it to the window, which keeps the per-pixel
 * cost the same on a big monitor and a small laptop.
 */
export class Renderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly u: Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: false });
    if (gl === null) throw new Error('This browser does not support WebGL2.');
    this.gl = gl;
    const program = createProgram(gl, VERTEX_SOURCE, fragmentSource());
    gl.useProgram(program);
    bindFullscreenTriangle(gl, program);
    this.u = uniformLocations(gl, program, UNIFORMS);
  }

  draw(frame: SceneFrame): void {
    const { gl, u } = this;
    const { width, height } = gl.canvas;
    gl.viewport(0, 0, width, height);
    gl.uniform2f(u.uRes, width, height);
    gl.uniform1f(u.uTime, frame.time);
    gl.uniform1f(u.uRoomSeed, frame.roomSeed);
    gl.uniform4fv(u.uSolids, frame.solids);
    gl.uniform1i(u.uSolidCount, frame.solidCount);
    gl.uniform4fv(u.uIce, frame.ice);
    gl.uniform1i(u.uIceCount, frame.iceCount);
    gl.uniform2fv(u.uPickups, frame.pickups);
    gl.uniform1i(u.uPickupCount, frame.pickupCount);
    gl.uniform4fv(u.uSeekers, frame.seekers);
    gl.uniform2fv(u.uTargets, frame.targets);
    gl.uniform1i(u.uSeekerCount, frame.seekerCount);
    gl.uniform1f(u.uDashReady, frame.dashReady);
    gl.uniform4fv(u.uSpikes, frame.spikes);
    gl.uniform1i(u.uSpikeCount, frame.spikeCount);
    gl.uniform4fv(u.uStreaks, frame.streaks);
    gl.uniform2fv(u.uStreakHeat, frame.streakHeat);
    gl.uniform1i(u.uStreakCount, frame.streakCount);
    gl.uniform4fv(u.uMarks, frame.marks);
    gl.uniform1i(u.uMarkCount, frame.markCount);
    gl.uniform1f(u.uMarkScale, frame.markScale);
    gl.uniform4fv(u.uPlayer, frame.player);
    gl.uniform1f(u.uPlayerVisible, frame.playerVisible);
    gl.uniform1f(u.uStride, frame.stride);
    gl.uniform4fv(u.uBurst, frame.burst);
    gl.uniform4fv(u.uExit, frame.exit);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
