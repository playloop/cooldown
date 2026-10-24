import type { Action, InputLatch } from './input-latch';

/** Which physical keys mean what. `KeyboardEvent.code`, so layouts do not matter. */
export const KEY_BINDINGS: Readonly<Record<string, Action>> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  Space: 'jump',
  KeyZ: 'jump',
  ArrowUp: 'jump',
  KeyW: 'jump',
  KeyX: 'dash',
  ShiftLeft: 'dash',
  ShiftRight: 'dash',
  KeyK: 'dash',
};

/** Feeds keyboard events into the latch. Returns a function that unhooks it. */
export function bindKeyboard(target: Window, latch: InputLatch): () => void {
  const onKey = (event: KeyboardEvent): void => {
    const action = KEY_BINDINGS[event.code];
    if (action === undefined) return;
    event.preventDefault();
    if (event.type === 'keydown') latch.down(action);
    else latch.up(action);
  };
  const onBlur = (): void => {
    latch.releaseAll();
  };
  target.addEventListener('keydown', onKey);
  target.addEventListener('keyup', onKey);
  target.addEventListener('blur', onBlur);
  return () => {
    target.removeEventListener('keydown', onKey);
    target.removeEventListener('keyup', onKey);
    target.removeEventListener('blur', onBlur);
  };
}
