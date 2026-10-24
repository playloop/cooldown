import type { GameState } from '../sim/game';
import type { ControlResult } from '../sim/movement';

/** Local feedback, deliberately separate from analytics events. */
export type SoundCue = 'jump' | 'dash' | 'ice' | 'refill' | 'streak-cool'
  | 'seeker-lock' | 'seeker-charge' | 'death' | 'room-clear' | 'run-clear';

/** Called before death/room transitions replace the world with a fresh room. */
export function actionCues(before: GameState, after: GameState,
  controls: Pick<ControlResult, 'jumpStarted' | 'dashStarted'>, dt: number): SoundCue[] {
  const cues: SoundCue[] = [];
  if (controls.jumpStarted) cues.push('jump');
  if (controls.dashStarted) cues.push('dash');
  if (after.ice.length < before.ice.length) cues.push('ice');
  if (after.pickups.length < before.pickups.length) cues.push('refill');
  // Warn once as the last part of a streak enters its final quarter-second.
  if (before.streaks.some((s) => {
    const at = s.endTime + s.lifetime - 0.25;
    return before.clock - dt < at && after.clock >= at;
  })) cues.push('streak-cool');
  after.seekers.forEach((s, i) => {
    const previous = before.seekers[i];
    if (s.mode === previous?.mode) return;
    if (s.mode === 'windup') cues.push('seeker-lock');
    if (s.mode === 'charge') cues.push('seeker-charge');
  });
  return [...new Set(cues)];
}
