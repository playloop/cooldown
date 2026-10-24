/** Seconds as m:ss.cc, the way speedrun timers show it. */
export function formatTime(seconds: number): string {
  const centis = Math.floor(Math.max(seconds, 0) * 100 + 1e-6);
  const minutes = Math.floor(centis / 6000);
  const secs = Math.floor(centis / 100) % 60;
  const cs = centis % 100;
  return `${minutes}:${String(secs).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}
