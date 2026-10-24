import { ICE, PLAYER } from '../config';
import { overlaps, rect, type Rect } from '../core/rect';
import type { Point } from '../world/room';

/** Fixed-size cells bound geometry growth even after many intersecting cuts. */
export function makeIce(blocks: readonly Rect[]): readonly Rect[] {
  const cells: Rect[] = [];
  for (const b of blocks) {
    for (let y = b.y; y < b.y + b.h - 1e-6; y += ICE.cell) {
      for (let x = b.x; x < b.x + b.w - 1e-6; x += ICE.cell) {
        cells.push(rect(x, y, Math.min(ICE.cell, b.x + b.w - x), Math.min(ICE.cell, b.y + b.h - y)));
      }
    }
  }
  return cells;
}

/** At the fixed step, this swept body leaves a generous, continuous passage. */
export function carveIce(cells: readonly Rect[], from: Point, to: Point): readonly Rect[] {
  const hw = PLAYER.halfWidth + ICE.clearance;
  const hh = PLAYER.halfHeight + ICE.clearance;
  const cut = rect(Math.min(from.x, to.x) - hw, Math.min(from.y, to.y) - hh,
    Math.abs(to.x - from.x) + 2 * hw, Math.abs(to.y - from.y) + 2 * hh);
  return cells.filter((cell) => !overlaps(cell, cut));
}

/** Coalesce adjacent runs for rendering, without changing their occupied area. */
export function iceRects(cells: readonly Rect[]): readonly Rect[] {
  const sorted = [...cells].sort((a, b) => a.y - b.y || a.x - b.x);
  const out: Rect[] = [];
  for (const cell of sorted) {
    const last = out.at(-1);
    if (last && last.y === cell.y && last.h === cell.h && Math.abs(last.x + last.w - cell.x) < 1e-6) {
      out[out.length - 1] = { ...last, w: last.w + cell.w };
    } else out.push(cell);
  }
  const merged: Rect[] = [];
  for (const run of out) {
    const index = merged.findIndex((r) => r.x === run.x && r.w === run.w && Math.abs(r.y + r.h - run.y) < 1e-6);
    const below = merged[index];
    if (below) merged[index] = { ...below, h: below.h + run.h };
    else merged.push(run);
  }
  return merged;
}
