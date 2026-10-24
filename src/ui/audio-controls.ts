import type { GameAudio } from '../audio/game-audio';

/** Small native controls stay keyboard-accessible without moving the runner. */
export function bindAudioControls(audio: GameAudio, root: HTMLElement): void {
  const mute = root.querySelector<HTMLButtonElement>('#audio-mute');
  const music = root.querySelector<HTMLInputElement>('#audio-music');
  const effects = root.querySelector<HTMLInputElement>('#audio-effects');
  const status = root.querySelector<HTMLElement>('#audio-status');
  if (!mute || !music || !effects || !status) throw new Error('Missing audio controls');
  const refresh = (): void => {
    mute.textContent = audio.settings.muted ? 'Unmute [M]' : 'Mute [M]';
    mute.setAttribute('aria-pressed', String(audio.settings.muted));
    music.value = String(Math.round(audio.settings.music * 100));
    effects.value = String(Math.round(audio.settings.effects * 100));
    status.textContent = audio.status;
  };
  const toggle = (): void => { audio.configure({ ...audio.settings, muted: !audio.settings.muted }); refresh(); };
  mute.addEventListener('click', toggle);
  music.addEventListener('input', () => { audio.configure({ ...audio.settings, music: Number(music.value) / 100 }); });
  effects.addEventListener('input', () => { audio.configure({ ...audio.settings, effects: Number(effects.value) / 100 }); });
  const unlock = (): void => { void audio.unlock().then(refresh); };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'KeyM' && !(e.target instanceof Element && e.target.closest('input, button, summary'))) {
      e.preventDefault();
      toggle();
    }
    unlock();
  });
  document.addEventListener('visibilitychange', () => { void audio.setActive(!document.hidden).then(refresh); });
  refresh();
}
