import type { Action, InputLatch } from './input-latch';

/** Which physical keys mean what. `KeyboardEvent.code`, so layouts do not matter. */
export const KEY_BINDINGS: Readonly<Record<string, Action>> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowDown: 'down',
  KeyS: 'down',
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
  const keys = new Set<string>();
  const onKey = (event: KeyboardEvent): void => {
    // Range sliders and buttons own their arrows/Space instead of steering the game.
    const controlOwnsKey = typeof Element !== 'undefined' && event.target instanceof Element
      && event.target.closest('input, button, summary') !== null;
    if (event.type === 'keydown' && controlOwnsKey) return;
    const action = KEY_BINDINGS[event.code];
    if (action === undefined) return;
    if (!controlOwnsKey) event.preventDefault();
    if (event.type === 'keydown') keys.add(event.code);
    else keys.delete(event.code);
    // Multiple physical keys may hold the same action. Releasing one must not
    // release another. Up/W also retain their original jump behavior.
    for (const name of ['left', 'right', 'down', 'jump', 'dash'] as const) {
      if ([...keys].some((key) => KEY_BINDINGS[key] === name)) latch.down(name);
      else latch.up(name);
    }
    if (keys.has('ArrowUp') || keys.has('KeyW')) latch.down('up');
    else latch.up('up');
  };
  const onBlur = (): void => {
    keys.clear();
    latch.releaseAll();
  };
  target.addEventListener('keydown', onKey);
  target.addEventListener('keyup', onKey);
  target.addEventListener('blur', onBlur);
  target.document.addEventListener('visibilitychange', onBlur);
  return () => {
    target.removeEventListener('keydown', onKey);
    target.removeEventListener('keyup', onKey);
    target.removeEventListener('blur', onBlur);
    target.document.removeEventListener('visibilitychange', onBlur);
  };
}
