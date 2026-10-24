import type { EventBus } from './events/event-bus';
import type { GameEvent } from './events/game-events';
import type { GameState } from './sim/game';

export interface DebugOptions {
  readonly enabled: boolean;
  /** Start in this room (0-based). Only honored with debug on. */
  readonly startRoom: number;
  /**
   * Render at the screen's real pixel size instead of the fixed 1280x720 canvas. Only honored with
   * debug on: it costs more per frame, so it is for recording footage, not for players.
   */
  readonly nativeResolution: boolean;
}

/** Reads `?debug`, `?room=N` and `?native` from the page URL. */
export function readDebugOptions(search: string, roomCount: number): DebugOptions {
  const params = new URLSearchParams(search);
  const enabled = params.has('debug');
  const asked = Number.parseInt(params.get('room') ?? '', 10);
  const valid = enabled && Number.isInteger(asked) && asked >= 0 && asked < roomCount;
  return { enabled, startRoom: valid ? asked : 0, nativeResolution: enabled && params.has('native') };
}

export interface DebugHandle {
  readonly state: () => GameState;
  readonly events: readonly GameEvent[];
  /** Sets the death-mark flame size (1 as designed), so a recording can sweep it live. */
  readonly setMarkScale: (scale: number) => void;
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
export function exposeDebug(
  target: Window,
  bus: EventBus<GameEvent>,
  state: () => GameState,
  setMarkScale: (scale: number) => void,
): void {
  const events: GameEvent[] = [];
  bus.subscribe((e) => events.push(e));
  target.cooldown = { state, events, setMarkScale };
}
