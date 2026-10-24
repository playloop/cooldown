import { DEATH } from '../config';
import { overlaps } from '../core/rect';
import type { GameEvent } from '../events/game-events';
import type { Point, Room } from '../world/room';
import { moveAndCollide } from './collision';
import { deathCheck, droppedByCooling, type DeathCause } from './death';
import { isActive, type InputFrame } from './input-frame';
import { applyControls } from './movement';
import { bodyOf, spawnPlayer, type Player } from './player';
import type { Streak } from './streak';
import { platformsOf, updateStreaks } from './streak-list';

export type Phase =
  | { readonly kind: 'playing' }
  | { readonly kind: 'dying'; readonly since: number; readonly at: Point; readonly cause: DeathCause }
  | { readonly kind: 'cleared'; readonly since: number };

export interface DeathMark extends Point {
  readonly room: number;
}

export interface GameState {
  readonly phase: Phase;
  readonly room: number;
  readonly player: Player;
  readonly streaks: readonly Streak[];
  /** Seconds since the game loaded. Drives streak heat and the shader's motion. */
  readonly clock: number;
  /** The run timer starts on the first input, not on page load. */
  readonly started: boolean;
  readonly runTime: number;
  readonly deaths: number;
  /** Where earlier deaths happened, oldest first. Drawn as warm marks. */
  readonly marks: readonly DeathMark[];
}

export interface StepResult {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
}

/** Seconds on the cleared screen before a jump press starts a new run. */
const RESTART_GUARD = 0.5;

export function newGame(rooms: readonly Room[], startRoom = 0, clock = 0): GameState {
  return {
    phase: { kind: 'playing' },
    room: startRoom,
    player: spawnPlayer(roomAt(rooms, startRoom).spawn),
    streaks: [],
    clock,
    started: false,
    runTime: 0,
    deaths: 0,
    marks: [],
  };
}

/** Advances the whole game by one fixed step. Pure: same inputs, same result. */
export function stepGame(
  state: GameState,
  input: InputFrame,
  dt: number,
  rooms: readonly Room[],
): StepResult {
  const clock = state.clock + dt;
  const runTime = state.started && state.phase.kind !== 'cleared' ? state.runTime + dt : state.runTime;
  const ticked = { ...state, clock, runTime };
  switch (ticked.phase.kind) {
    case 'playing':
      return stepPlaying(ticked, input, dt, rooms);
    case 'dying':
      return stepDying(ticked, ticked.phase.since, rooms);
    case 'cleared':
      return stepCleared(ticked, input, ticked.phase.since, rooms);
    default:
      return assertNever(ticked.phase);
  }
}

function stepPlaying(
  state: GameState,
  input: InputFrame,
  dt: number,
  rooms: readonly Room[],
): StepResult {
  const events: GameEvent[] = [];
  let s = state;
  if (!s.started && isActive(input)) {
    s = { ...s, started: true };
    events.push({ type: 'run_started' }, roomEntered(s.room, rooms));
  }

  const room = roomAt(rooms, s.room);
  const before = s.player;
  const { player: controlled, dashStarted } = applyControls(before, input, dt);
  const moved = moveAndCollide(controlled, dt, room.solids, platformsOf(s.streaks, s.clock));
  const landed = moved.support !== null;
  const afterMove: Player = { ...controlled, ...moved };
  const player: Player = {
    ...afterMove,
    canDash: afterMove.canDash || moved.support === 'ground',
    droppedByCooling: landed
      ? false
      : before.droppedByCooling || droppedByCooling(before, afterMove, s.streaks),
  };
  s = { ...s, player, streaks: updateStreaks(s.streaks, before, player, dashStarted, s.clock) };

  const cause = deathCheck(player, room);
  if (cause !== null) return die(s, cause, events);

  if (overlaps(bodyOf(player), room.exit)) return leaveRoom(s, rooms, events);
  return { state: s, events };
}

function die(s: GameState, cause: DeathCause, events: GameEvent[]): StepResult {
  const at = { x: s.player.x, y: s.player.y };
  const mark: DeathMark = { ...at, room: s.room };
  events.push({ type: 'player_died', room: s.room, cause, ...at, runTime: s.runTime });
  return {
    state: {
      ...s,
      phase: { kind: 'dying', since: s.clock, at, cause },
      deaths: s.deaths + 1,
      marks: [...s.marks, mark].slice(-DEATH.maxMarks),
    },
    events,
  };
}

function leaveRoom(s: GameState, rooms: readonly Room[], events: GameEvent[]): StepResult {
  const next = s.room + 1;
  if (next >= rooms.length) {
    events.push({ type: 'run_completed', runTime: s.runTime, deaths: s.deaths });
    return { state: { ...s, phase: { kind: 'cleared', since: s.clock } }, events };
  }
  events.push(roomEntered(next, rooms));
  return { state: { ...s, ...respawnIn(rooms, next) }, events };
}

function stepDying(s: GameState, since: number, rooms: readonly Room[]): StepResult {
  if (s.clock - since < DEATH.respawnDelay) return { state: s, events: [] };
  return { state: { ...s, phase: { kind: 'playing' }, ...respawnIn(rooms, s.room) }, events: [] };
}

function stepCleared(
  s: GameState,
  input: InputFrame,
  since: number,
  rooms: readonly Room[],
): StepResult {
  const restart = input.jumpPressed && s.clock - since >= RESTART_GUARD;
  return { state: restart ? newGame(rooms, 0, s.clock) : s, events: [] };
}

function respawnIn(rooms: readonly Room[], room: number): Pick<GameState, 'room' | 'player' | 'streaks'> {
  return { room, player: spawnPlayer(roomAt(rooms, room).spawn), streaks: [] };
}

function roomEntered(room: number, rooms: readonly Room[]): GameEvent {
  return { type: 'room_entered', room, name: roomAt(rooms, room).name };
}

export function roomAt(rooms: readonly Room[], index: number): Room {
  const room = rooms[index];
  if (room === undefined) throw new RangeError(`No room ${index}; there are ${rooms.length}.`);
  return room;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled phase: ${JSON.stringify(value)}`);
}
