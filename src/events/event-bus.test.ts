import { describe, expect, it } from 'vitest';
import { EventBus } from './event-bus';

describe('EventBus', () => {
  it('delivers each event to every subscriber', () => {
    const bus = new EventBus<string>();
    const a: string[] = [];
    const b: string[] = [];
    bus.subscribe((e) => a.push(e));
    bus.subscribe((e) => b.push(e));
    bus.publish('hello');
    expect(a).toEqual(['hello']);
    expect(b).toEqual(['hello']);
  });

  it('stops delivering after unsubscribe', () => {
    const bus = new EventBus<number>();
    const got: number[] = [];
    const off = bus.subscribe((e) => got.push(e));
    bus.publish(1);
    off();
    bus.publish(2);
    expect(got).toEqual([1]);
  });
});
