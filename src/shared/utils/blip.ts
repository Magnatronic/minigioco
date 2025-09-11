let audioCtx: AudioContext | null = null;

function ensureAudio() {
  if (audioCtx) return audioCtx;
  const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return null;
  audioCtx = new Ctx();
  const unlock = () => {
    audioCtx?.resume();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
  return audioCtx;
}

export function blip({ volume = 0.6, startHz = 880, endHz = 660, durationMs = 150 } = {}) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.value = startHz;
  g.gain.value = Math.max(0, Math.min(1, volume));
  o.connect(g);
  g.connect(ctx.destination);
  const t = ctx.currentTime;
  o.start(t);
  o.frequency.setValueAtTime(startHz, t);
  o.frequency.exponentialRampToValueAtTime(endHz, t + durationMs / 1000);
  g.gain.setValueAtTime(g.gain.value, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + (durationMs + 10) / 1000);
  o.stop(t + (durationMs + 20) / 1000);
}
