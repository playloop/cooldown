import type { Rect } from '../core/rect';

/** A row of upward spikes standing on `baseY`, from x0 to x1. */
export interface SpikeRow {
  readonly x0: number;
  readonly x1: number;
  readonly baseY: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * One screen of the level. Rooms are plain data: adding a room never means
 * touching the simulation.
 */
export interface Room {
  readonly name: string;
  readonly solids: readonly Rect[];
  readonly spikes: readonly SpikeRow[];
  /** Where the runner's feet start. */
  readonly spawn: Point;
  /** Touching this moves on to the next room (or finishes the run in the last one). */
  readonly exit: Rect;
}
