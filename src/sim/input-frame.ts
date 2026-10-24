/**
 * What the player asked for during one simulation step. `held` flags are the
 * current key state; `pressed` flags are true only on the step the key went down.
 * The simulation never reads the keyboard, so tests drive it with plain objects.
 */
export interface InputFrame {
  readonly left: boolean;
  readonly right: boolean;
  readonly jumpHeld: boolean;
  readonly jumpPressed: boolean;
  readonly dashPressed: boolean;
}

export const NO_INPUT: InputFrame = {
  left: false,
  right: false,
  jumpHeld: false,
  jumpPressed: false,
  dashPressed: false,
};

/** -1 for left, 1 for right, 0 for neither or both. */
export function horizontalAxis(input: InputFrame): -1 | 0 | 1 {
  if (input.left === input.right) return 0;
  return input.left ? -1 : 1;
}

/** True when the player did anything at all this step. */
export function isActive(input: InputFrame): boolean {
  return input.left || input.right || input.jumpPressed || input.dashPressed;
}
