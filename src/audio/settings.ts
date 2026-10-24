export interface AudioSettings {
  readonly music: number;
  readonly effects: number;
  readonly muted: boolean;
}

export const DEFAULT_AUDIO: AudioSettings = { music: 0.35, effects: 0.8, muted: false };
export const AUDIO_STORAGE_KEY = 'cooldown.audio.v1';

/** Corrupt or older settings must not make the game fail to start. */
export function parseAudioSettings(raw: string | null): AudioSettings {
  try {
    const value: unknown = JSON.parse(raw ?? 'null');
    if (typeof value !== 'object' || value === null) return DEFAULT_AUDIO;
    const data = value as Record<string, unknown>;
    const level = (v: unknown, fallback: number): number =>
      typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback;
    return { music: level(data.music, DEFAULT_AUDIO.music), effects: level(data.effects, DEFAULT_AUDIO.effects),
      muted: typeof data.muted === 'boolean' ? data.muted : false };
  } catch { return DEFAULT_AUDIO; }
}

export function loadAudioSettings(): AudioSettings {
  try { return parseAudioSettings(localStorage.getItem(AUDIO_STORAGE_KEY)); }
  catch { return DEFAULT_AUDIO; }
}

export function saveAudioSettings(settings: AudioSettings): void {
  try { localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(settings)); }
  catch { /* Storage can be unavailable in an embedded or private browser. */ }
}
