import { after, afterDash, atX, type Move } from './play-script';

/**
 * A known way through each room, keyed by room name, found by searching the
 * real simulation.
 * The room tests replay these, so a level or physics change that makes a room
 * impossible fails loudly instead of shipping.
 */
export const AIR_ROUTES = {
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
  'Break the ice': [
    { press: 'jump', when: atX(9.5) }, { press: 'dash', when: after(0.25) },
  ],
  'Cut a bridge': [
    { press: 'jump', when: atX(8.5) }, { press: 'dash', when: after(0.25) },
    { press: 'jump', when: (s) => s.player.x >= 17 && s.player.support === 'ground' },
  ],
  'Second wind': [
    { press: 'jump', when: atX(8.5) }, { press: 'dash', when: after(0.3) },
    { press: 'dash', when: afterDash(0) }, { press: 'dash', when: afterDash(0) },
    { press: 'jump', when: afterDash(0) },
  ],  'A new angle': [
    { press: 'jump', when: atX(7) }, { press: 'dash', aim: 'up', when: after(0.3) },
    { press: 'jump', when: atX(18.5) }, { press: 'dash', aim: 'up', when: after(0.3) },
  ],
  'Through and over': [
    { press: 'jump', when: atX(9) }, { press: 'dash', aim: 'up', when: after(0.2) },
    { press: 'jump', when: afterDash(0) }, { press: 'dash', when: after(0.4) },
    { press: 'jump', when: afterDash(0) },
  ],
  'Bait': [
    { press: 'jump', when: atX(11) }, { press: 'dash', when: after(0.3) },
    { press: 'jump', when: afterDash(0) },
  ],
  'Crossfire': [
    { press: 'jump', when: atX(8.5) }, { press: 'dash', when: after(0.3) },
    { press: 'dash', when: afterDash(0) }, { press: 'dash', aim: 'up', when: afterDash(0) },
    { press: 'jump', when: afterDash(0) },
  ],  'All that heat': [
    { press: 'jump', when: atX(8.5) }, { press: 'dash', when: after(0.3) },
    { press: 'dash', when: afterDash(0) }, { press: 'dash', aim: 'up', when: afterDash(0) },
    { press: 'jump', when: afterDash(0) },
  ],} satisfies Record<string, readonly Move[]>;


/** Main routes land on resting shelves before taking the next gap. */
export const ROUTES = {
  ...AIR_ROUTES,
  'Second wind': [
    { press: 'jump', when: atX(8.5) }, { press: 'dash', when: after(0.3) },
    { press: 'jump', when: (s) => s.player.x >= 18 && s.player.support === 'ground' },
    { press: 'dash', when: after(0.3) },
  ],
  'Through and over': [
    { press: 'jump', when: atX(9) }, { press: 'dash', aim: 'up', when: after(0.2) },
    { press: 'jump', when: (s) => s.player.x >= 18 && s.player.support === 'ground' },
    { press: 'dash', aim: 'up', when: after(0.3) },
    { press: 'jump', when: afterDash(0) },
  ],
  'Crossfire': [
    { press: 'jump', when: atX(8.5) }, { press: 'dash', when: after(0.3) },
    { press: 'jump', when: (s) => s.player.x >= 18 && s.player.support === 'ground' },
    { press: 'dash', aim: 'up', when: after(0.3) },
    { press: 'jump', when: afterDash(0) },
  ],
  'All that heat': [
    { press: 'jump', when: atX(8.5) }, { press: 'dash', when: after(0.3) },
    { press: 'jump', when: (s) => s.player.x >= 18 && s.player.support === 'ground' },
    { press: 'dash', aim: 'up', when: after(0.3) },
    { press: 'jump', when: afterDash(0) },
  ],
} satisfies Record<string, readonly Move[]>;
