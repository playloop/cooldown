import { PLAYER, SEEKER } from '../config';
import { boxAround, type Rect } from '../core/rect';
import { expanded, segmentHit } from '../core/segment';
import type { Point } from '../world/room';
import type { Player } from './player';
import { endHeats, type Streak } from './streak';

export interface Seeker extends Point {
  readonly mode: 'waiting' | 'windup' | 'charge' | 'recover';
  readonly timer: number;
  readonly target: Point;
}

export const spawnSeekers = (points: readonly Point[]): readonly Seeker[] =>
  points.map((p) => ({ ...p, mode: 'waiting', timer: 0, target: p }));

/** Sample the continuous heat line; hottest visible sample wins, newest breaks ties. */
export function chooseTarget(seeker: Point, streaks: readonly Streak[], walls: readonly Rect[], now: number): Point | null {
  let best: Point | null = null;
  let bestHeat = 0;
  for (const s of streaks) {
    const heats = endHeats(s, now);
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const heat = heats[0] + (heats[1] - heats[0]) * t;
      const point = { x: s.startX + (s.endX - s.startX) * t, y: s.y + (s.endY - s.y) * t + 0.1 };
      if (heat <= 0 || heat < bestHeat || Math.hypot(point.x - seeker.x, point.y - seeker.y) > SEEKER.range) continue;
      if (walls.some((wall) => segmentHit(seeker, point, wall) !== null)) continue;
      best = point;
      bestHeat = heat;
    }
  }
  return best;
}

export function stepSeekers(seekers: readonly Seeker[], streaks: readonly Streak[], walls: readonly Rect[],
  now: number, dt: number, beforePlayer: Player, player: Player): { seekers: readonly Seeker[]; hit: boolean } {
  let hit = false;
  const moved = seekers.map((s): Seeker => {
    let next: Seeker = s;
    const timer = Math.max(0, s.timer - dt);
    if (s.mode === 'waiting') {
      const target = chooseTarget(s, streaks, walls, now);
      if (target) next = { ...s, target, mode: 'windup', timer: SEEKER.windup };
    } else if (s.mode === 'windup') {
      next = { ...s, timer, mode: timer === 0 ? 'charge' : 'windup' };
    } else if (s.mode === 'recover') {
      next = { ...s, timer, mode: timer === 0 ? 'waiting' : 'recover' };
    } else {
      const dx = s.target.x - s.x, dy = s.target.y - s.y;
      const distance = Math.hypot(dx, dy);
      const step = Math.min(distance, SEEKER.speed * dt);
      const end = distance < 1e-6 ? s : { x: s.x + dx / distance * step, y: s.y + dy / distance * step };
      let fraction = 1;
      for (const wall of walls) {
        const contact = segmentHit(s, end, expanded(wall, SEEKER.radius));
        if (contact !== null) fraction = Math.min(fraction, Math.max(0, contact - 1e-4));
      }
      const stopped = fraction < 1 || distance <= step + 1e-6;
      next = { ...s, x: s.x + (end.x - s.x) * fraction, y: s.y + (end.y - s.y) * fraction,
        mode: stopped ? 'recover' : 'charge', timer: stopped ? SEEKER.recovery : 0 };
    }
    // Relative sweep also catches a player dashing through a stationary seeker.
    const a = { x: beforePlayer.x - s.x, y: beforePlayer.y - s.y };
    const b = { x: player.x - next.x, y: player.y - next.y };
    if (segmentHit(a, b, boxAround(0, 0, PLAYER.halfWidth + SEEKER.radius, PLAYER.halfHeight + SEEKER.radius)) !== null) hit = true;
    return next;
  });
  return { seekers: moved, hit };
}
