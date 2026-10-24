import type { SoundCue } from '../events/action-cues';
import { loadAudioSettings, saveAudioSettings, type AudioSettings } from './settings';

const CUES: Record<SoundCue, { files: readonly string[]; gain: number; spacing: number }> = {
  jump: { files: ['jump-1'], gain: 0.55, spacing: 0.06 },
  dash: { files: ['dash-1', 'dash-2'], gain: 0.7, spacing: 0.06 },
  ice: { files: ['ice-1', 'ice-2'], gain: 0.55, spacing: 0.22 },
  refill: { files: ['refill-1'], gain: 0.7, spacing: 0.06 },
  'streak-cool': { files: ['streak-cool-1'], gain: 0.22, spacing: 0.3 },
  'seeker-lock': { files: ['seeker-lock-1'], gain: 0.9, spacing: 0.12 },
  'seeker-charge': { files: ['seeker-charge-1'], gain: 0.8, spacing: 0.12 },
  death: { files: ['death-1'], gain: 0.7, spacing: 0.12 },
  'room-clear': { files: ['room-clear-1'], gain: 0.65, spacing: 0.12 },
  'run-clear': { files: ['run-clear-1'], gain: 0.75, spacing: 0.12 },
};

/** Independent music/effects buses and bounded voices; no simulation dependencies. */
export class GameAudio {
  settings = loadAudioSettings();
  status = 'Move or click for sound';
  private context: AudioContext | undefined;
  private musicBus: GainNode | undefined;
  private effectsBus: GainNode | undefined;
  private master: GainNode | undefined;
  private music: AudioBufferSourceNode | undefined;
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly last = new Map<SoundCue, number>();
  private readonly variants = new Map<SoundCue, number>();
  private readonly voices = new Set<AudioBufferSourceNode>();
  private loading: Promise<void> | undefined;
  private started = false;
  private active = true;
  private readonly pending: { cue: SoundCue; at: number }[] = [];
  private played = 0;
  private readonly cueCounts: Partial<Record<SoundCue, number>> = {};

  /** Called directly from a gesture, never awaited by the game loop. */
  async unlock(): Promise<void> {
    try {
      if (!this.context) this.createContext();
      const context = this.context;
      if (!context) return;
      // resume must happen before the first await to retain gesture authorization.
      const resumed = context.resume();
      this.loading ??= this.load(context).catch((error: unknown) => {
        this.loading = undefined;
        throw error;
      });
      await Promise.all([resumed, this.loading]);
      this.status = 'Sound ready';
      if (!this.active) { await context.suspend(); return; }
      this.startMusic();
      for (const { cue, at } of this.pending.splice(0)) {
        if (performance.now() - at < 300) this.play(cue);
      }
    } catch {
      this.status = 'Sound unavailable. Click to retry.';
      this.pending.length = 0;
    }
  }

  private createContext(): void {
    const c = this.context = new AudioContext();
    this.master = c.createGain();
    this.master.gain.value = this.settings.muted ? 0 : 0.8;
    const limiter = c.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 6;
    limiter.ratio.value = 8;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.15;
    this.master.connect(limiter);
    limiter.connect(c.destination);
    this.musicBus = c.createGain();
    this.effectsBus = c.createGain();
    this.musicBus.gain.value = this.settings.music;
    this.effectsBus.gain.value = this.settings.effects;
    this.musicBus.connect(this.master);
    this.effectsBus.connect(this.master);
  }

  private async load(context: AudioContext): Promise<void> {
    this.status = 'Loading sound';
    const files = ['driving-embers-loop', ...Object.values(CUES).flatMap((cue) => cue.files)];
    await Promise.all(files.map(async (name) => {
      if (this.buffers.has(name)) return;
      const response = await fetch(`${import.meta.env.BASE_URL}audio/${name}.ogg`);
      if (!response.ok) throw new Error(`Audio asset failed: ${name}`);
      this.buffers.set(name, await context.decodeAudioData(await response.arrayBuffer()));
    }));
  }

  setStarted(started: boolean): void {
    if (started) this.started = true;
    this.startMusic();
  }

  private startMusic(): void {
    const buffer = this.buffers.get('driving-embers-loop');
    if (!this.started || !this.active || this.music || !buffer || !this.context || !this.musicBus) return;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.musicBus);
    this.musicBus.gain.setValueAtTime(0, this.context.currentTime);
    this.musicBus.gain.setTargetAtTime(this.settings.music, this.context.currentTime, 0.04);
    source.start();
    this.music = source;
  }

  play(cue: SoundCue): void {
    const c = this.context;
    const spec = CUES[cue];
    const index = this.variants.get(cue) ?? 0;
    const file = spec.files[index % spec.files.length];
    const buffer = file ? this.buffers.get(file) : undefined;
    if (!c || !buffer || !this.effectsBus) {
      if (this.pending.length < 12) this.pending.push({ cue, at: performance.now() });
      return;
    }
    if (!this.active || c.state !== 'running' || this.settings.muted || this.settings.effects === 0) return;
    if (c.currentTime - (this.last.get(cue) ?? -100) < spec.spacing) return;
    this.last.set(cue, c.currentTime);
    this.variants.set(cue, index + 1);
    if (cue === 'death' || cue === 'room-clear' || cue === 'run-clear') this.stopEffects();
    // Retire the oldest voice when a dense sequence reaches the budget.
    if (this.voices.size >= 12) {
      const oldest = this.voices.values().next().value;
      if (oldest) { oldest.stop(); this.voices.delete(oldest); }
    }
    const source = c.createBufferSource();
    const gain = c.createGain();
    source.buffer = buffer;
    gain.gain.value = spec.gain;
    source.connect(gain);
    gain.connect(this.effectsBus);
    this.voices.add(source);
    source.onended = (): void => { this.voices.delete(source); source.disconnect(); gain.disconnect(); };
    source.start();
    this.played++;
    this.cueCounts[cue] = (this.cueCounts[cue] ?? 0) + 1;
  }

  private stopEffects(): void {
    for (const source of this.voices) source.stop();
    this.voices.clear();
  }

  configure(settings: AudioSettings): void {
    this.settings = settings;
    saveAudioSettings(settings);
    const c = this.context;
    if (!c) return;
    this.master?.gain.setTargetAtTime(settings.muted ? 0 : 0.8, c.currentTime, 0.02);
    this.musicBus?.gain.setTargetAtTime(settings.music, c.currentTime, 0.04);
    this.effectsBus?.gain.setTargetAtTime(settings.effects, c.currentTime, 0.02);
    if (settings.muted || settings.effects === 0) this.stopEffects();
  }

  async setActive(active: boolean): Promise<void> {
    this.active = active;
    if (!active) { this.stopEffects(); this.pending.length = 0; await this.context?.suspend(); }
    else if (this.context) {
      try { await this.context.resume(); this.startMusic(); }
      catch { this.status = 'Click to resume sound'; }
    }
  }

  /** Read-only diagnostic for private playtests. */
  inspect(): { state: string; buffers: number; voices: number; played: number; music: boolean;
    loopSeconds: number; cues: Partial<Record<SoundCue, number>> } {
    return { state: this.context?.state ?? 'locked', buffers: this.buffers.size, voices: this.voices.size,
      played: this.played, music: Boolean(this.music), loopSeconds: this.music?.buffer?.duration ?? 0,
      cues: { ...this.cueCounts } };
  }
}
