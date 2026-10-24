import { describe, expect, it } from 'vitest';
import { InputLatch } from './input-latch';

describe('InputLatch', () => {
  it('reports a press once, then only as held', () => {
    const latch = new InputLatch();
    latch.down('jump');
    expect(latch.take()).toMatchObject({ jumpPressed: true, jumpHeld: true });
    expect(latch.take()).toMatchObject({ jumpPressed: false, jumpHeld: true });
  });

  it('keeps a tap that went down and up between two steps', () => {
    const latch = new InputLatch();
    latch.down('dash');
    latch.up('dash');
    expect(latch.take().dashPressed).toBe(true);
  });

  it('ignores key repeat while a key is held', () => {
    const latch = new InputLatch();
    latch.down('jump');
    latch.take();
    latch.down('jump');
    expect(latch.take().jumpPressed).toBe(false);
  });

  it('releases everything when focus is lost, including presses not yet taken', () => {
    const latch = new InputLatch();
    latch.down('right');
    latch.down('jump');
    latch.down('dash');
    latch.releaseAll();
    expect(latch.take()).toEqual({
      left: false,
      right: false,
      jumpHeld: false,
      jumpPressed: false,
      dashPressed: false,
    });
  });
});
