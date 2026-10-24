import { PLAYER, REFILL } from '../config';
import type { Point } from '../world/room';
import type { Player } from './player';

export function collectRefills(player: Player, pickups: readonly Point[]): { player: Player; pickups: readonly Point[] } {
  if (player.canDash) return { player, pickups };
  const index = pickups.findIndex((p) => Math.abs(p.x - player.x) < REFILL.radius + PLAYER.halfWidth &&
    Math.abs(p.y - player.y) < REFILL.radius + PLAYER.halfHeight);
  if (index < 0) return { player, pickups };
  return { player: { ...player, canDash: true }, pickups: pickups.filter((_p, i) => i !== index) };
}
