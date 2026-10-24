import type { EventBus } from './event-bus';
import type { GameEvent } from './game-events';

/** The one telemetry call the game makes. The Playloop client's `telemetry` fits it, and so does a test fake. */
export interface TelemetrySink {
  track(name: string, data: Record<string, unknown>): void;
}

export interface TelemetryEvent {
  readonly name: string;
  readonly data: Record<string, unknown>;
}

/**
 * A GameEvent as telemetry: its type becomes the event name and every other
 * field goes along unchanged, so a death arrives with its cause.
 */
export function toTelemetry(event: GameEvent): TelemetryEvent {
  const { type, ...data } = event;
  return { name: type, data };
}

/** Sends every event on the bus to the sink. Returns a function that stops it again. */
export function sendToTelemetry(bus: EventBus<GameEvent>, sink: TelemetrySink): () => void {
  return bus.subscribe((event) => {
    const { name, data } = toTelemetry(event);
    sink.track(name, data);
  });
}
