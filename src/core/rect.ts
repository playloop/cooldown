/** An axis-aligned box. (x, y) is the bottom-left corner; y points up. */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export function rect(x: number, y: number, w: number, h: number): Rect {
  return { x, y, w, h };
}

/** A box from its center and half extents. */
export function boxAround(cx: number, cy: number, halfW: number, halfH: number): Rect {
  return { x: cx - halfW, y: cy - halfH, w: halfW * 2, h: halfH * 2 };
}

export function right(r: Rect): number {
  return r.x + r.w;
}

export function top(r: Rect): number {
  return r.y + r.h;
}

/** True when the boxes share interior area. Touching edges do not count. */
export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < right(b) && b.x < right(a) && a.y < top(b) && b.y < top(a);
}

/** True when the closed horizontal ranges [a0, a1] and [b0, b1] share interior length. */
export function spansOverlap(a0: number, a1: number, b0: number, b1: number): boolean {
  return a0 < b1 && b0 < a1;
}
