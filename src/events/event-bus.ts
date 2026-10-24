export type Listener<E> = (event: E) => void;

/**
 * A minimal typed publish/subscribe hub. The game publishes; sinks (the debug
 * recorder today, analytics later) subscribe. Neither side imports the other.
 */
export class EventBus<E> {
  private readonly listeners = new Set<Listener<E>>();

  /** Returns a function that removes the listener again. */
  subscribe(listener: Listener<E>): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  publish(event: E): void {
    for (const listener of this.listeners) listener(event);
  }
}
