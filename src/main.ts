import { TIMING } from './config';
import { FixedStep } from './core/fixed-step';
import { exposeDebug, readDebugOptions } from './debug';
import { EventBus } from './events/event-bus';
import type { GameEvent } from './events/game-events';
import { InputLatch } from './input/input-latch';
import { bindKeyboard } from './input/keyboard';
import { Renderer } from './render/renderer';
import { SceneFrame } from './render/scene-frame';
import { newGame, roomAt, stepGame } from './sim/game';
import { Hud } from './ui/hud';
import { ROOMS } from './world/rooms';
import './style.css';

/** Finds a required element by id, or fails loudly at startup. */
function byId<T extends HTMLElement>(id: string, type: new () => T): T {
  const el = document.getElementById(id);
  if (!(el instanceof type)) throw new Error(`index.html is missing #${id}.`);
  return el;
}

// The composition root: the only place that knows about every part. Each part
// below can be swapped or tested without the others.
const options = readDebugOptions(location.search, ROOMS.length);
const latch = new InputLatch();
bindKeyboard(window, latch);
const bus = new EventBus<GameEvent>();
const renderer = new Renderer(byId('screen', HTMLCanvasElement));
const frame = new SceneFrame();
const hud = new Hud(
  {
    room: byId('hud-room', HTMLElement),
    time: byId('hud-time', HTMLElement),
    deaths: byId('hud-deaths', HTMLElement),
    title: byId('title', HTMLElement),
    cleared: byId('cleared', HTMLElement),
    clearedStats: byId('cleared-stats', HTMLElement),
  },
  ROOMS,
);
const clock = new FixedStep(TIMING.step, TIMING.maxFrameSeconds);

let state = newGame(ROOMS, options.startRoom);

// TODO(episode 1): subscribe the Playloop TypeScript SDK here, so every
// GameEvent (deaths with their cause first) is tracked as telemetry.
if (options.enabled) exposeDebug(window, bus, () => state);

let lastTime = performance.now();
function tick(now: number): void {
  const steps = clock.advance((now - lastTime) / 1000);
  lastTime = now;
  for (let i = 0; i < steps; i++) {
    const result = stepGame(state, latch.take(), TIMING.step, ROOMS);
    state = result.state;
    for (const event of result.events) bus.publish(event);
  }
  frame.fill(state, roomAt(ROOMS, state.room));
  renderer.draw(frame);
  hud.update(state);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
