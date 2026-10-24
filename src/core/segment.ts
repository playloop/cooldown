import type { Point } from './point';
import type { Rect } from './rect';

/** Slab intersection: first contact along a segment, or null. Handles zero axes. */
export function segmentHit(a: Point, b: Point, box: Rect): number | null {
  let entry = 0;
  let exit = 1;
  for (const [start, delta, low, high] of [
    [a.x, b.x - a.x, box.x, box.x + box.w],
    [a.y, b.y - a.y, box.y, box.y + box.h],
  ] as const) {
    if (Math.abs(delta) < 1e-9) {
      if (start < low || start > high) return null;
    } else {
      const t0 = (low - start) / delta;
      const t1 = (high - start) / delta;
      entry = Math.max(entry, Math.min(t0, t1));
      exit = Math.min(exit, Math.max(t0, t1));
      if (entry > exit) return null;
    }
  }
  return entry;
}

export function expanded(box: Rect, x: number, y = x): Rect {
  return { x: box.x - x, y: box.y - y, w: box.w + x * 2, h: box.h + y * 2 };
}
