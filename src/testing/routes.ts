import { after, afterDash, atX, type Move } from './play-script';

/**
 * A known way through each room, keyed by room name, found by searching the
 * real simulation.
 * The room tests replay these, so a level or physics change that makes a room
 * impossible fails loudly instead of shipping.
 */
export const ROUTES = {
  'Warm up': [
    { press: 'jump', when: atX(7.5) },
    { press: 'jump', when: atX(16.5) },
    { press: 'dash', when: after(0.3) },
  ],
  'Stand on it': [
    { press: 'jump', when: atX(9.25) },
    { press: 'dash', when: after(0.475) },
    { press: 'jump', when: afterDash(0) },
  ],
  'The gap': [
    // Jump just before the edge, dash late on the way down so the streak lands
    // farther out, then run to its end and jump.
    { press: 'jump', when: atX(7.75) },
    { press: 'dash', when: after(0.6) },
    { press: 'jump', when: afterDash(0.1) },
  ],
  'Cool down': [],
} satisfies Record<string, readonly Move[]>;
