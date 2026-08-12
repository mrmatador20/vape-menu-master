// Toca o arquivo de alerta de novo pedido usando Web Audio API (com fallback para <audio>).
export const ORDER_ALERT_SRC = "/sounds/order-alert.mp3";

let ctx: AudioContext | null = null;
let buffer: AudioBuffer | null = null;

const getCtx = (): AudioContext | null => {
  const AudioCtx =
    (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
      .AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx) ctx = new AudioCtx();
  return ctx;
};

/** Pré-carrega o áudio e destrava o contexto (chamar em um gesto do usuário). */
export const primeOrderAlert = async () => {
  try {
    const audioCtx = getCtx();
    if (!audioCtx) return;
    if (audioCtx.state === "suspended") await audioCtx.resume();
    if (!buffer) {
      const res = await fetch(ORDER_ALERT_SRC);
      const arr = await res.arrayBuffer();
      buffer = await audioCtx.decodeAudioData(arr);
    }
  } catch (e) {
    console.warn("[OrderAlert] prime failed", e);
  }
};

export const playOrderAlert = async () => {
  try {
    const audioCtx = getCtx();
    if (audioCtx) {
      if (audioCtx.state === "suspended") await audioCtx.resume();
      if (!buffer) await primeOrderAlert();
      if (buffer) {
        const src = audioCtx.createBufferSource();
        src.buffer = buffer;
        const gain = audioCtx.createGain();
        gain.gain.value = 1;
        src.connect(gain);
        gain.connect(audioCtx.destination);
        src.start();
        return;
      }
    }
  } catch (e) {
    console.warn("[OrderAlert] WebAudio failed, falling back", e);
  }

  try {
    const el = new Audio(ORDER_ALERT_SRC);
    el.volume = 1;
    await el.play();
  } catch (e) {
    console.warn("[OrderAlert] audio element failed", e);
  }
};
