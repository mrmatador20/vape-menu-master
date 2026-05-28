// WebAudio-synthesized notification sound presets. No external assets needed.

export type SoundId =
  | "ding_dong"
  | "classic_bell"
  | "cash_register"
  | "coin"
  | "chime"
  | "arcade"
  | "marimba"
  | "alert";

export const SOUND_PRESETS: { id: SoundId; label: string; description: string }[] = [
  { id: "ding_dong", label: "Ding-Dong", description: "Campainha suave em dois tons" },
  { id: "classic_bell", label: "Sino Clássico", description: "Toque longo de sino" },
  { id: "cash_register", label: "Caixa Registradora", description: "Cha-ching de venda" },
  { id: "coin", label: "Moeda", description: "Som rápido de moeda" },
  { id: "chime", label: "Carrilhão", description: "Três notas ascendentes" },
  { id: "arcade", label: "Arcade", description: "Bip retrô estilo fliperama" },
  { id: "marimba", label: "Marimba", description: "Notas suaves estilo iOS" },
  { id: "alert", label: "Alerta", description: "Bipes curtos e firmes" },
];

type Voice = {
  freq: number;
  start: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
};

function getCtx(): AudioContext | null {
  const AudioCtx =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;
  return new AudioCtx();
}

function playVoices(ctx: AudioContext, voices: Voice[]) {
  let maxEnd = 0;
  for (const v of voices) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = v.type ?? "sine";
    osc.frequency.value = v.freq;
    const peak = v.gain ?? 0.25;
    const t0 = ctx.currentTime + v.start;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0008, t0 + v.duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + v.duration);
    maxEnd = Math.max(maxEnd, v.start + v.duration);
  }
  setTimeout(() => ctx.close().catch(() => {}), maxEnd * 1000 + 200);
}

function playNoiseBurst(ctx: AudioContext, start: number, duration: number, gainPeak = 0.15) {
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const gain = ctx.createGain();
  const t0 = ctx.currentTime + start;
  gain.gain.setValueAtTime(gainPeak, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 2000;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(t0);
  src.stop(t0 + duration);
}

export function playSound(id: SoundId) {
  try {
    const ctx = getCtx();
    if (!ctx) return;

    switch (id) {
      case "ding_dong":
        playVoices(ctx, [
          { freq: 880, start: 0, duration: 0.3 },
          { freq: 1175, start: 0.18, duration: 0.4 },
        ]);
        break;

      case "classic_bell":
        playVoices(ctx, [
          { freq: 1318, start: 0, duration: 1.2, type: "triangle", gain: 0.3 },
          { freq: 2637, start: 0, duration: 1.0, type: "sine", gain: 0.1 },
          { freq: 3950, start: 0, duration: 0.6, type: "sine", gain: 0.05 },
        ]);
        break;

      case "cash_register":
        // ding then "cha-ching" sparkle
        playVoices(ctx, [
          { freq: 1568, start: 0, duration: 0.18, type: "square", gain: 0.18 },
          { freq: 2093, start: 0.05, duration: 0.4, type: "triangle", gain: 0.2 },
          { freq: 2637, start: 0.3, duration: 0.5, type: "sine", gain: 0.15 },
          { freq: 3136, start: 0.35, duration: 0.45, type: "sine", gain: 0.1 },
        ]);
        playNoiseBurst(ctx, 0, 0.08, 0.12);
        playNoiseBurst(ctx, 0.3, 0.15, 0.08);
        break;

      case "coin":
        playVoices(ctx, [
          { freq: 988, start: 0, duration: 0.08, type: "square", gain: 0.2 },
          { freq: 1319, start: 0.06, duration: 0.25, type: "square", gain: 0.2 },
        ]);
        break;

      case "chime":
        playVoices(ctx, [
          { freq: 523, start: 0, duration: 0.5, type: "sine" },
          { freq: 659, start: 0.15, duration: 0.5, type: "sine" },
          { freq: 784, start: 0.3, duration: 0.7, type: "sine" },
        ]);
        break;

      case "arcade":
        playVoices(ctx, [
          { freq: 660, start: 0, duration: 0.08, type: "square", gain: 0.18 },
          { freq: 880, start: 0.1, duration: 0.08, type: "square", gain: 0.18 },
          { freq: 1320, start: 0.2, duration: 0.18, type: "square", gain: 0.18 },
        ]);
        break;

      case "marimba":
        playVoices(ctx, [
          { freq: 1046, start: 0, duration: 0.25, type: "triangle", gain: 0.28 },
          { freq: 1568, start: 0.12, duration: 0.3, type: "triangle", gain: 0.22 },
          { freq: 2093, start: 0.24, duration: 0.4, type: "triangle", gain: 0.18 },
        ]);
        break;

      case "alert":
        playVoices(ctx, [
          { freq: 1000, start: 0, duration: 0.15, type: "square", gain: 0.2 },
          { freq: 1000, start: 0.2, duration: 0.15, type: "square", gain: 0.2 },
          { freq: 1000, start: 0.4, duration: 0.2, type: "square", gain: 0.2 },
        ]);
        break;
    }
  } catch (e) {
    console.warn("[Notify] sound failed", e);
  }
}
