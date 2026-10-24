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

/** Ten short lessons. Lower resting ledges leave room to recover; aerial routes save time. */
export const ROOMS: readonly Room[] = [
  {
    name: 'Warm up', hint: 'Jump the small gap. Jump, then dash across the wide one.',
    solids: [ground(0, 9, 4), warmUp.floor, ground(12, 18, 4), firstGap.floor, ground(26, 32, 4)],
    spikes: [warmUp.spikes, firstGap.spikes], spawn: { x: 2, y: 4 }, exit: exitAt(4),
  },
  {
    name: 'Stand on it', hint: 'Jump, dash, then jump from your streak. It lasts about a second.',
    solids: [ground(0, 11, 3), climbPit.floor, ground(20, 32, 6.5)],
    spikes: [climbPit.spikes], spawn: { x: 2, y: 3 }, exit: exitAt(6.5),
  },
  {
    name: 'Break the ice', hint: 'Dash through the ice. The opening stays until you retry.',
    solids: [ground(0, 32, 3)], ice: [rect(12, 3, 2, 8)],
    spikes: [], spawn: { x: 2, y: 3 }, exit: exitAt(3),
  },
  {
    name: 'Cut a bridge', hint: 'Carve high, then jump off the streak. The low shelf is a place to rest.',
    solids: [ground(0, 12, 3), pit(12, 21).floor, ground(16, 18, 3), ground(21, 32, 4)],
    ice: [rect(10.5, 3, 2, 8)], spikes: [pit(12.5, 16).spikes, pit(18, 21).spikes],
    spawn: { x: 2, y: 3 }, exit: exitAt(4),
  },
  {
    name: 'Second wind', hint: 'The hollow diamond gives back one dash. Streaks do not.',
    solids: [ground(0, 10, 3), pit(10, 23).floor, ground(17, 19, 3), ground(23, 32, 3)],
    pickups: [{ x: 14, y: 6.2 }, { x: 18, y: 6.2 }, { x: 21, y: 6.2 }],
    spikes: [pit(10, 17).spikes, pit(19, 23).spikes], spawn: { x: 2, y: 3 }, exit: exitAt(3),
  },
  {
    name: 'A new angle', diagonal: true,
    hint: 'Diagonals unlocked. Hold Up/W or Down/S as you dash. Space jumps without aiming.',
    solids: [ground(0, 12, 3), ground(12, 22, 7.5), ground(22, 32, 10.5)],
    spikes: [], spawn: { x: 2, y: 3 }, exit: exitAt(10.5),
  },
  {
    name: 'Through and over', diagonal: true,
    hint: 'An angled cut leaves a ramp. Jump from it, or catch a diamond and dash again.',
    solids: [ground(0, 12, 3), pit(12, 22).floor, ground(17, 19, 3), ground(22, 32, 6)],
    ice: [rect(11, 3, 2, 8)], pickups: [{ x: 15, y: 8.5 }, { x: 21, y: 6.2 }],
    spikes: [pit(13, 17).spikes, pit(19, 22).spikes], spawn: { x: 2, y: 3 }, exit: exitAt(6),
  },
  {
    name: 'Bait', diagonal: true,
    hint: 'Seekers mark a hot streak, then charge that spot. Move away from the marked spot.',
    solids: [ground(0, 32, 3)], seekers: [{ x: 18, y: 4 }],
    spikes: [], spawn: { x: 2, y: 3 }, exit: exitAt(3),
  },
  {
    name: 'Crossfire', diagonal: true,
    hint: 'Leave heat behind to draw the seeker away. The middle shelf gives you a breather.',
    solids: [ground(0, 10, 3), pit(10, 23).floor, ground(16, 19, 3), ground(23, 32, 5)],
    seekers: [{ x: 25, y: 6 }], pickups: [{ x: 14, y: 6.2 }, { x: 18, y: 6.2 }, { x: 21, y: 6.2 }],
    spikes: [pit(10, 16).spikes, pit(19, 23).spikes], spawn: { x: 2, y: 3 }, exit: exitAt(5),
  },
  {
    name: 'All that heat', diagonal: true,
    hint: 'Carve, refill, climb, and leave the seeker a streak to chase. You know the way.',
    solids: [ground(0, 12, 3), pit(12, 23).floor, ground(16, 19, 3), ground(23, 32, 7)],
    ice: [rect(10.5, 3, 2, 8)], pickups: [{ x: 14, y: 6.2 }, { x: 18, y: 6.2 }, { x: 21, y: 6.2 }],
    seekers: [{ x: 27, y: 8 }], spikes: [pit(12.5, 16).spikes, pit(19, 23).spikes],
    spawn: { x: 2, y: 3 }, exit: exitAt(7),
  },
];
