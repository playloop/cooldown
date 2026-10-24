import type { EventBus } from './events/event-bus';
import type { GameEvent } from './events/game-events';
import type { GameState } from './sim/game';

export interface DebugOptions {
  readonly enabled: boolean;
  /** Start in this room (0-based). Only honored with debug on. */
  readonly startRoom: number;
}

/** Reads `?debug` and `?room=N` from the page URL. */
export function readDebugOptions(search: string, roomCount: number): DebugOptions {
  const params = new URLSearchParams(search);
  const enabled = params.has('debug');
  const asked = Number.parseInt(params.get('room') ?? '', 10);
  const valid = enabled && Number.isInteger(asked) && asked >= 0 && asked < roomCount;
  return { enabled, startRoom: valid ? asked : 0 };
}

export interface DebugHandle {
  readonly state: () => GameState;
  readonly events: readonly GameEvent[];
}

declare global {
  interface Window {
    cooldown?: DebugHandle;
  }
}

/**
 * With `?debug`, exposes the live state and every event as `window.cooldown`,
 * so a browser test (or you, in the console) can see what the game sees.
 */
export function exposeDebug(target: Window, bus: EventBus<GameEvent>, state: () => GameState): void {
  const events: GameEvent[] = [];
  bus.subscribe((e) => events.push(e));
  target.cooldown = { state, events };
}
