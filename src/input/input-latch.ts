import type { InputFrame } from '../sim/input-frame';

export type Action = 'left' | 'right' | 'up' | 'down' | 'jump' | 'dash';

/**
 * Collects key downs and ups between simulation steps and hands each step an
 * InputFrame. A press is kept until a step takes it, so a tap shorter than one
 * frame still counts, and it is handed out exactly once.
 */
export class InputLatch {
  private readonly held = new Set<Action>();
  private readonly pressed = new Set<Action>();

  down(action: Action): void {
    if (!this.held.has(action)) this.pressed.add(action);
    this.held.add(action);
  }

  up(action: Action): void {
    this.held.delete(action);
  }

  /**
   * Lets go of everything, for when the window loses focus mid-press. Pending
   * presses go too, so a key pressed just before the blur does not fire after it.
   */
  releaseAll(): void {
    this.held.clear();
    this.pressed.clear();
  }

  /** The input for the next step. Clears the presses it returns. */
  take(): InputFrame {
    const frame: InputFrame = {
      left: this.held.has('left'),
      right: this.held.has('right'),
      up: this.held.has('up'),
      down: this.held.has('down'),
      jumpHeld: this.held.has('jump'),
      jumpPressed: this.pressed.has('jump'),
      dashPressed: this.pressed.has('dash'),
    };
    this.pressed.clear();
    return frame;
  }
}
