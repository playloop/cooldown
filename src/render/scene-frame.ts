import { DASH, DEATH, SPIKES, STREAK } from '../config';
import type { Rect } from '../core/rect';
import type { GameState } from '../sim/game';
import { endHeats } from '../sim/streak';
import type { Room } from '../world/room';

/** Fixed array sizes in the shader. A room that needs more fails fast in fill(). */
export const LIMITS = {
  solids: 16,
  spikes: 8,
  streaks: STREAK.maxAlive,
  marks: 8,
} as const;

/** How fast the legs cycle while running, in radians per second. */
const STRIDE_RATE = 14;
/** The legs-apart pose used in the air. */
const AIR_STRIDE = 0.9;

/**
 * Everything the shader needs for one frame, packed into flat typed arrays that
 * map one to one onto uniforms. Pure data: no WebGL here, so it is testable.
 * The arrays are allocated once and refilled every frame.
 */
export class SceneFrame {
  time = 0;
  roomSeed = 0;
  readonly solids = new Float32Array(LIMITS.solids * 4);
  solidCount = 0;
  /** Per row: x0, x1, baseY, spike count. */
  readonly spikes = new Float32Array(LIMITS.spikes * 4);
  spikeCount = 0;
  /** Per streak: startX, endX, top y, unused. */
  readonly streaks = new Float32Array(LIMITS.streaks * 4);
  /** Per streak: unclamped heat at startX and at endX. */
  readonly streakHeat = new Float32Array(LIMITS.streaks * 2);
  streakCount = 0;
  /** Per mark: x, y, warmth, unused. */
  readonly marks = new Float32Array(LIMITS.marks * 4);
  markCount = 0;
  /** x, y, facing, dash glow (1 at the start of a dash, 0 when not dashing). */
  readonly player = new Float32Array(4);
  playerVisible = 1;
  stride = 0;
  /** x, y, age (0 to 1), on. */
  readonly burst = new Float32Array(4);
  /** Center x, center y, half width, half height. */
  readonly exit = new Float32Array(4);

  fill(state: GameState, room: Room): void {
    this.time = state.clock;
    this.roomSeed = state.room;
    this.solidCount = packRects(this.solids, room.solids, LIMITS.solids, 'solids');
    this.packSpikes(room);
    this.packStreaks(state);
    this.packMarks(state);
    this.packPlayer(state);
    writeBox(this.exit, 0, room.exit);
  }

  private packSpikes(room: Room): void {
    assertFits(room.spikes.length, LIMITS.spikes, 'spike rows');
    room.spikes.forEach((row, i) => {
      const count = Math.max(1, Math.round((row.x1 - row.x0) / SPIKES.width));
      this.spikes.set([row.x0, row.x1, row.baseY, count], i * 4);
    });
    this.spikeCount = room.spikes.length;
  }

  private packStreaks(state: GameState): void {
    state.streaks.forEach((streak, i) => {
      this.streaks.set([streak.startX, streak.endX, streak.y, 0], i * 4);
      this.streakHeat.set(endHeats(streak, state.clock), i * 2);
    });
    this.streakCount = state.streaks.length;
  }

  private packMarks(state: GameState): void {
    const here = state.marks.filter((m) => m.room === state.room).slice(-LIMITS.marks);
    here.forEach((m, i) => {
      // The newest mark is the warmest; older ones fade but never vanish.
      const warmth = 0.35 + (0.65 * (i + 1)) / here.length;
      this.marks.set([m.x, m.y, warmth, 0], i * 4);
    });
    this.markCount = here.length;
  }

  private packPlayer(state: GameState): void {
    const p = state.player;
    this.player.set([p.x, p.y, p.facing, p.dashTime / DASH.duration]);
    const running = p.support !== null && Math.abs(p.vx) > 0.5;
    this.stride = running ? state.clock * STRIDE_RATE : AIR_STRIDE;
    const phase = state.phase;
    this.playerVisible = phase.kind === 'dying' ? 0 : 1;
    if (phase.kind === 'dying') {
      const age = Math.min((state.clock - phase.since) / DEATH.respawnDelay, 1);
      this.burst.set([phase.at.x, phase.at.y, age, 1]);
    } else {
      this.burst[3] = 0;
    }
  }
}

function packRects(out: Float32Array, rects: readonly Rect[], limit: number, what: string): number {
  assertFits(rects.length, limit, what);
  rects.forEach((r, i) => {
    writeBox(out, i * 4, r);
  });
  return rects.length;
}

/** Writes a rect as center and half extents, the form the box SDF wants. */
function writeBox(out: Float32Array, offset: number, r: Rect): void {
  out.set([r.x + r.w / 2, r.y + r.h / 2, r.w / 2, r.h / 2], offset);
}

function assertFits(count: number, limit: number, what: string): void {
  if (count > limit) throw new RangeError(`A room has ${count} ${what}; the shader holds ${limit}.`);
}
