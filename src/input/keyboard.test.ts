import { describe, expect, it } from 'vitest';
import { bindKeyboard } from './keyboard';
import { InputLatch } from './input-latch';

function keyboard() {
  const target = Object.assign(new EventTarget(), { document: new EventTarget() });
  const latch = new InputLatch();
  const unbind = bindKeyboard(target as unknown as Window, latch);
  const key = (type: 'keydown' | 'keyup', code: string): void => {
    target.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), { code }));
  };
  return { target, latch, key, unbind };
}

describe('keyboard input', () => {
  it('keeps Up/W as jump while also supplying diagonal aim', () => {
    const { key, latch } = keyboard();
    key('keydown', 'ArrowUp');
    expect(latch.take()).toMatchObject({ up: true, jumpHeld: true, jumpPressed: true });
    key('keyup', 'ArrowUp');
    key('keydown', 'Space');
    expect(latch.take()).toMatchObject({ up: false, jumpHeld: true, jumpPressed: true });
  });
  it('does not release an action until all of its physical keys are up', () => {
    const { key, latch } = keyboard();
    key('keydown', 'KeyX');
    key('keydown', 'ShiftLeft');
    expect(latch.take().dashPressed).toBe(true);
    key('keyup', 'KeyX');
    key('keydown', 'ShiftLeft');
    expect(latch.take().dashPressed).toBe(false);
    key('keyup', 'ShiftLeft');
    key('keydown', 'KeyK');
    expect(latch.take().dashPressed).toBe(true);
  });
  it('clears held aim and queued presses on blur, and unhooks cleanly', () => {
    const { target, key, latch, unbind } = keyboard();
    key('keydown', 'KeyS');
    key('keydown', 'KeyK');
    target.dispatchEvent(new Event('blur'));
    expect(latch.take()).toMatchObject({ down: false, dashPressed: false });
    unbind();
    key('keydown', 'KeyK');
    expect(latch.take().dashPressed).toBe(false);
  });
});
