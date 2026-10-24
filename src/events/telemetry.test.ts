import { describe, expect, it } from 'vitest';
import { EventBus } from './event-bus';
import type { GameEvent } from './game-events';
import { sendToTelemetry, toTelemetry, type TelemetryEvent } from './telemetry';

/** One of every GameEvent, so a new event type shows up here as a missing case. */
const EVERY_EVENT: Record<GameEvent['type'], GameEvent> = {
  run_started: { type: 'run_started' },
  room_entered: { type: 'room_entered', room: 1, name: 'The Gap' },
  player_died: { type: 'player_died', room: 2, cause: 'streak_cooled', x: 120.5, y: 64, runTime: 31.25 },
  run_completed: { type: 'run_completed', runTime: 95.5, deaths: 7 },
};

describe('toTelemetry', () => {
  it('sends a death out with its cause, room, place and time', () => {
    expect(toTelemetry(EVERY_EVENT.player_died)).toEqual({
      name: 'player_died',
      data: { room: 2, cause: 'streak_cooled', x: 120.5, y: 64, runTime: 31.25 },
    });
  });

  it('names each event by its type and keeps every other field', () => {
    for (const event of Object.values(EVERY_EVENT)) {
      const { type, ...fields } = event;
      expect(toTelemetry(event)).toEqual({ name: type, data: fields });
    }
  });

  it('sends a run start with no data fields', () => {
    expect(toTelemetry(EVERY_EVENT.run_started)).toEqual({ name: 'run_started', data: {} });
  });
});

describe('sendToTelemetry', () => {
  it('tracks every published event, in order, until stopped', () => {
    const bus = new EventBus<GameEvent>();
    const tracked: TelemetryEvent[] = [];
    const stop = sendToTelemetry(bus, { track: (name, data) => tracked.push({ name, data }) });

    bus.publish(EVERY_EVENT.room_entered);
    bus.publish(EVERY_EVENT.player_died);
    stop();
    bus.publish(EVERY_EVENT.run_completed);

    expect(tracked).toEqual([toTelemetry(EVERY_EVENT.room_entered), toTelemetry(EVERY_EVENT.player_died)]);
  });
});
