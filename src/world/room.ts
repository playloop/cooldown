import type { Rect } from '../core/rect';
import type { Point } from '../core/point';
export type { Point } from '../core/point';

/** A row of upward spikes standing on `baseY`, from x0 to x1. */
export interface SpikeRow {
  readonly x0: number;
  readonly x1: number;
  readonly baseY: number;
}

/**
 * One screen of the level. Rooms are plain data: adding a room never means
 * touching the simulation.
 */
export interface Room {
  readonly name: string;
  readonly hint?: string;
  readonly diagonal?: boolean;
  readonly ice?: readonly Rect[];
  readonly pickups?: readonly Point[];
  readonly seekers?: readonly Point[];
  readonly solids: readonly Rect[];
  readonly spikes: readonly SpikeRow[];
  /** Where the runner's feet start. */
  readonly spawn: Point;
  /** Touching this moves on to the next room (or finishes the run in the last one). */
  readonly exit: Rect;
}
