import { actionCues, type SoundCue } from '../events/action-cues';
import { DEATH, RUN, STREAK } from '../config';
import { overlaps, type Rect } from '../core/rect';
import type { GameEvent } from '../events/game-events';
import type { Point, Room } from '../world/room';
import { deathCheck, type DeathCause } from './death';
import { isActive, type InputFrame } from './input-frame';
import { bodyOf, spawnPlayer, type Player } from './player';
import { stepPlayer } from './step-player';
import type { Streak } from './streak';
import { updateStreaks } from './streak-list';
import { makeIce } from './ice';
import { collectRefills } from './pickups';
import { spawnSeekers, stepSeekers, type Seeker } from './seeker';

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
  readonly ice: readonly Rect[];
  readonly pickups: readonly Point[];
  readonly seekers: readonly Seeker[];
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
  readonly cues: readonly SoundCue[];
}

export function newGame(rooms: readonly Room[], startRoom = 0, clock = 0): GameState {
  return {
    phase: { kind: 'playing' },
    ...respawnIn(rooms, startRoom),
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
  let next = state;
  if (!next.started && isActive(input)) {
    next = { ...next, started: true };
    events.push({ type: 'run_started' }, roomEntered(next.room, rooms));
  }

  const room = roomAt(rooms, next.room);
  const before = next.player;
  const moved = stepPlayer(before, input, dt, room, next.streaks, next.clock, next.ice);
  const { player, pickups } = collectRefills(moved.player, next.pickups);
  const { dashStarted, ice } = moved;
  const streaks = updateStreaks(next.streaks, before, player, dashStarted, next.clock, STREAK.lifetime);
  const threats = stepSeekers(next.seekers, streaks, [...room.solids, ...ice], next.clock, dt, before, player);
  const beforeActions = next;
  next = { ...next, player, streaks, ice, pickups, seekers: threats.seekers };
  const cues = actionCues(beforeActions, next, moved, dt);

  if (threats.hit) return die(next, 'killed_by_seeker', events);
  const cause = deathCheck(player, room);
  if (cause !== null) return die(next, cause, events);
  if (overlaps(bodyOf(player), room.exit)) return leaveRoom(next, rooms, events);
  return { state: next, events, cues };
}

function die(state: GameState, cause: DeathCause, events: GameEvent[]): StepResult {
  const at = { x: state.player.x, y: state.player.y };
  const mark: DeathMark = { ...at, room: state.room };
  events.push({ type: 'player_died', room: state.room, cause, ...at, runTime: state.runTime });
  return {
    state: {
      ...state,
      phase: { kind: 'dying', since: state.clock, at, cause },
      deaths: state.deaths + 1,
      marks: [...state.marks, mark].slice(-DEATH.maxMarks),
    },
    events,
    cues: ['death'],
  };
}

function leaveRoom(state: GameState, rooms: readonly Room[], events: GameEvent[]): StepResult {
  const nextRoom = state.room + 1;
  if (nextRoom >= rooms.length) {
    events.push({ type: 'run_completed', runTime: state.runTime, deaths: state.deaths });
    return { state: { ...state, phase: { kind: 'cleared', since: state.clock } }, events, cues: ['run-clear'] };
  }
  events.push(roomEntered(nextRoom, rooms));
  return { state: { ...state, ...respawnIn(rooms, nextRoom) }, events, cues: ['room-clear'] };
}

function stepDying(state: GameState, since: number, rooms: readonly Room[]): StepResult {
  if (state.clock - since < DEATH.respawnDelay) return { state, events: [], cues: [] };
  return { state: { ...state, phase: { kind: 'playing' }, ...respawnIn(rooms, state.room) }, events: [], cues: [] };
}

function stepCleared(
  state: GameState,
  input: InputFrame,
  since: number,
  rooms: readonly Room[],
): StepResult {
  const restart = input.jumpPressed && state.clock - since >= RUN.restartGuard;
  return { state: restart ? newGame(rooms, 0, state.clock) : state, events: [], cues: [] };
}

function respawnIn(rooms: readonly Room[], room: number): Pick<GameState, 'room' | 'player' | 'streaks' | 'ice' | 'pickups' | 'seekers'> {
  const data = roomAt(rooms, room);
  return { room, player: spawnPlayer(data.spawn), streaks: [], ice: makeIce(data.ice ?? []),
    pickups: [...data.pickups ?? []], seekers: spawnSeekers(data.seekers ?? []) };
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
