import { WORLD } from '../config';
import { rect, type Rect } from '../core/rect';
import type { Room, SpikeRow } from './room';

/** Height of the spike floor at the bottom of every pit. */
const PIT_FLOOR = 1;

/** A block of ground from the bottom of the screen up to `top`. */
function ground(x0: number, x1: number, top: number): Rect {
  return rect(x0, 0, x1 - x0, top);
}

/** A pit between two pieces of ground: a low floor lined with spikes. */
function pit(x0: number, x1: number): { readonly floor: Rect; readonly spikes: SpikeRow } {
  return { floor: ground(x0, x1, PIT_FLOOR), spikes: { x0, x1, baseY: PIT_FLOOR } };
}

/** The doorway on the right edge of a room, standing on ground of height `floorTop`. */
function exitAt(floorTop: number): Rect {
  return rect(WORLD.width - 1, floorTop, 1, 4);
}

const warmUp = pit(9, 12);
const firstGap = pit(18, 26);

const climbPit = pit(11, 20);

// The deliberately too-hard jump. Reaching the far ledge needs a dash at the top
// of the first jump, then a second jump from the very end of the streak before
// it cools. This is the one players are meant to die on, and the numbers here
// (with STREAK.lifetime) are what an episode tunes after reading the deaths.
const gapPit = pit(8, 22.5);

export const ROOMS: readonly Room[] = [
  {
    name: 'Warm up',
    solids: [ground(0, 9, 4), warmUp.floor, ground(12, 18, 4), firstGap.floor, ground(26, 32, 4)],
    spikes: [warmUp.spikes, firstGap.spikes],
    spawn: { x: 2, y: 4 },
    exit: exitAt(4),
  },
  {
    name: 'Stand on it',
    solids: [ground(0, 11, 3), climbPit.floor, ground(20, 32, 6.5)],
    spikes: [climbPit.spikes],
    spawn: { x: 2, y: 3 },
    exit: exitAt(6.5),
  },
  {
    name: 'The gap',
    solids: [ground(0, 8, 5), gapPit.floor, ground(22.5, 32, 7.6)],
    spikes: [gapPit.spikes],
    spawn: { x: 2, y: 5 },
    exit: exitAt(7.6),
  },
  {
    name: 'Cool down',
    solids: [ground(0, 32, 3)],
    spikes: [],
    spawn: { x: 2, y: 3 },
    exit: exitAt(3),
  },
];
