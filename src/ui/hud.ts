import type { GameState } from '../sim/game';
import type { Room } from '../world/room';
import { formatTime } from './format';

export interface HudElements {
  readonly room: HTMLElement;
  readonly time: HTMLElement;
  readonly deaths: HTMLElement;
  readonly title: HTMLElement;
  readonly cleared: HTMLElement;
  readonly clearedStats: HTMLElement;
}

/** The text layer over the canvas. Only touches the DOM when a value changes. */
export class Hud {
  private readonly last = new Map<HTMLElement, string>();

  constructor(
    private readonly el: HudElements,
    private readonly rooms: readonly Room[],
  ) {}

  update(state: GameState): void {
    const room = this.rooms[state.room];
    this.set(this.el.room, `ROOM ${state.room + 1}/${this.rooms.length}  ${room?.name.toUpperCase() ?? ''}`);
    this.set(this.el.time, formatTime(state.runTime));
    this.set(this.el.deaths, `DEATHS ${state.deaths}`);
    this.el.title.hidden = state.started;
    const cleared = state.phase.kind === 'cleared';
    this.el.cleared.hidden = !cleared;
    if (cleared) {
      const deaths = state.deaths === 1 ? '1 death' : `${state.deaths} deaths`;
      this.set(this.el.clearedStats, `${formatTime(state.runTime)} with ${deaths}`);
    }
  }

  private set(el: HTMLElement, text: string): void {
    if (this.last.get(el) === text) return;
    this.last.set(el, text);
    el.textContent = text;
  }
}
