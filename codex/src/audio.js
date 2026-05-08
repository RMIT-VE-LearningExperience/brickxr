let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, dur, type = 'sine', vol = 0.22) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch (_) {}
}

export const audio = {
  grab: () => playTone(220, 0.07, 'square', 0.1),
  snap: () => {
    playTone(440, 0.14);
    setTimeout(() => playTone(660, 0.1), 55);
  },
  noSnap: () => playTone(145, 0.09, 'triangle', 0.12),
  rowDone: () => [523, 659, 784].forEach((f, i) => setTimeout(() => playTone(f, 0.3), i * 75)),
  complete: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.5), i * 85))
};
