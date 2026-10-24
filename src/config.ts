/**
 * Every tuning number in the game lives here, so a balance change is a one-line diff.
 * Units: world units (the screen is 32 x 18) and seconds. Y points up.
 */

/** The visible room. Every room is exactly one screen. */
export const WORLD = {
  width: 32,
  height: 18,
  /** Falling this far below the room floor counts as a death, in case a pit is left open. */
  killY: -2,
} as const;

/** The simulation runs at a fixed rate so the physics is identical on every machine. */
export const TIMING = {
  step: 1 / 120,
  /** A long stall (tab in the background) never replays more than this much time. */
  maxFrameSeconds: 0.25,
} as const;

export const PLAYER = {
  halfWidth: 0.3,
  halfHeight: 0.75,
  runSpeed: 7.5,
  groundAccel: 90,
  airAccel: 55,
  gravity: 30,
  maxFallSpeed: 22,
  jumpSpeed: 12.5,
  /** Letting go of jump while rising keeps this share of the upward speed (short hops). */
  jumpCutFactor: 0.45,
  /** A jump still works this long after running off a ledge. */
  coyoteTime: 0.08,
  /** A jump pressed this long before landing fires on the landing frame. */
  jumpBufferTime: 0.1,
} as const;

export const DASH = {
  speed: 18,
  duration: 0.2,
} as const;

export const STREAK = {
  /** Seconds each point of a streak stays solid after the dash passes over it. */
  lifetime: 1.1,
  /** Visual thickness below the standing surface. Collision only uses the top. */
  thickness: 0.34,
  /** Older streaks are dropped past this count. Also sizes the shader's uniform array. */
  maxAlive: 4,
} as const;

export const SPIKES = {
  /** Target width of one spike; a row picks the nearest whole count that fills it. */
  width: 0.75,
  height: 0.8,
  /** The deadly part is a little shorter than the drawn spike, so grazing a tip is fair. */
  hitHeight: 0.45,
} as const;

export const DEATH = {
  /** Seconds between dying and respawning (the burst plays in this window). */
  respawnDelay: 0.7,
  /** How many past deaths are remembered and drawn as warm marks. */
  maxMarks: 24,
} as const;
