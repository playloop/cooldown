import { expect, it } from 'vitest';
import { DEFAULT_AUDIO, parseAudioSettings } from './settings';

it('uses safe defaults for unavailable or corrupt storage', () => {
  for (const raw of [null, '', '{', 'null', '5', '"wrong"']) expect(parseAudioSettings(raw)).toEqual(DEFAULT_AUDIO);
});
it('keeps independent volume and mute preferences and clamps bad levels', () => {
  expect(parseAudioSettings('{"music":0,"effects":0.6,"muted":true}')).toEqual({ music: 0, effects: 0.6, muted: true });
  expect(parseAudioSettings('{"music":-2,"effects":9,"muted":"false"}')).toEqual({ music: 0, effects: 1, muted: false });
});
