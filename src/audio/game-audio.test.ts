import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { GameAudio } from './game-audio';
const save = vi.fn();

class Gain {
  value = 1;
  setValueAtTime(value: number): void { this.value = value; }
  setTargetAtTime(value: number): void { this.value = value; }
}
class Node {
  connect(): void { /* fake graph */ }
  disconnect(): void { /* fake graph */ }
}
class Source extends Node {
  buffer: { duration: number } | undefined;
  loop = false;
  onended: (() => void) | undefined;
  running = false;
  start(): void { this.running = true; }
  // Browser ended events are asynchronous: do not fire onended in stop().
  stop(): void { this.running = false; }
}
class Context {
  static instances: Context[] = [];
  state = 'suspended';
  currentTime = 0;
  destination = new Node();
  sources: Source[] = [];
  gains: Gain[] = [];
  constructor() { Context.instances.push(this); }
  resume(): Promise<void> { this.state = 'running'; return Promise.resolve(); }
  suspend(): Promise<void> { this.state = 'suspended'; return Promise.resolve(); }
  createGain(): Node & { gain: Gain } {
    const gain = new Gain(); this.gains.push(gain); return Object.assign(new Node(), { gain });
  }
  createDynamicsCompressor(): Node {
    return Object.assign(new Node(), { threshold: new Gain(), knee: new Gain(), ratio: new Gain(),
      attack: new Gain(), release: new Gain() });
  }
  decodeAudioData(): Promise<{ duration: number }> { return Promise.resolve({ duration: 48 }); }
  createBufferSource(): Source { const source = new Source(); this.sources.push(source); return source; }
}

beforeEach(() => {
  Context.instances = [];
  save.mockClear();
  vi.stubGlobal('AudioContext', Context);
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) })));
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: save });
});
afterEach(() => { vi.unstubAllGlobals(); });

it('starts one loop after a gesture and never stacks it on retries or repeated unlocks', async () => {
  const audio = new GameAudio();
  audio.setStarted(true);
  expect(Context.instances).toHaveLength(0);
  await Promise.all([audio.unlock(), audio.unlock()]);
  audio.setStarted(false);
  audio.setStarted(true);
  await audio.unlock();
  expect(Context.instances).toHaveLength(1);
  expect(Context.instances[0]?.sources.filter((s) => s.loop)).toHaveLength(1);
  expect(audio.inspect()).toMatchObject({ state: 'running', music: true, loopSeconds: 48, buffers: 13 });
});

it('keeps the voice cap even when ended events have not been delivered', async () => {
  const audio = new GameAudio();
  await audio.unlock();
  const context = Context.instances[0];
  if (!context) throw new Error('Missing test context');
  for (let i = 0; i < 40; i++) { context.currentTime += 0.3; audio.play('ice'); }
  expect(audio.inspect().voices).toBe(12);
  expect(context.sources.filter((s) => s.running)).toHaveLength(12);
  audio.play('death');
  expect(audio.inspect().voices).toBe(1);
});

it('suspends background audio, drops effects there, and resumes the same loop', async () => {
  const audio = new GameAudio();
  audio.setStarted(true);
  await audio.unlock();
  audio.play('dash');
  await audio.setActive(false);
  audio.play('jump');
  expect(audio.inspect()).toMatchObject({ state: 'suspended', voices: 0, played: 1 });
  await audio.setActive(true);
  expect(Context.instances[0]?.sources.filter((s) => s.loop)).toHaveLength(1);
});

it('mute silences the master, stops tails, and keeps independent saved levels', async () => {
  const audio = new GameAudio();
  await audio.unlock();
  audio.play('dash');
  audio.configure({ music: 0.2, effects: 0.6, muted: true });
  audio.play('jump');
  expect(audio.inspect()).toMatchObject({ voices: 0, played: 1 });
  expect(Context.instances[0]?.gains.slice(0, 3).map((g) => g.value)).toEqual([0, 0.2, 0.6]);
  expect(save).toHaveBeenCalledWith('cooldown.audio.v1', '{"music":0.2,"effects":0.6,"muted":true}');
});

it('recovers from an asset failure on another gesture without creating another context', async () => {
  const audio = new GameAudio();
  vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'));
  await audio.unlock();
  expect(audio.status).toContain('unavailable');
  await audio.unlock();
  expect(audio.status).toBe('Sound ready');
  expect(Context.instances).toHaveLength(1);
  expect(audio.inspect().buffers).toBe(13);
});
