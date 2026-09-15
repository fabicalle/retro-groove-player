/**
 * Approximation of the classic PS1 boot chime using the Web Audio API.
 * Two-stage: low rumble hit, then a reverb-soaked choir swell on a major chord.
 * Not an exact reproduction (copyrighted), but evokes the same feeling.
 */
export async function playPS1Chime(): Promise<void> {
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return;
  const ctx: AudioContext = new Ctx();
  if (ctx.state === "suspended") await ctx.resume();

  const now = ctx.currentTime;

  // Master with a simple convolver reverb (synthetic impulse response).
  const master = ctx.createGain();
  master.gain.value = 0.9;
  const convolver = ctx.createConvolver();
  convolver.buffer = makeImpulseResponse(ctx, 3.5, 3);
  const wet = ctx.createGain();
  wet.gain.value = 0.55;
  const dry = ctx.createGain();
  dry.gain.value = 0.7;
  master.connect(dry).connect(ctx.destination);
  master.connect(convolver).connect(wet).connect(ctx.destination);

  // 1. Low rumble hit (the "thud" at the start)
  const rumbleOsc = ctx.createOscillator();
  const rumbleGain = ctx.createGain();
  rumbleOsc.type = "sawtooth";
  rumbleOsc.frequency.setValueAtTime(55, now);
  rumbleOsc.frequency.exponentialRampToValueAtTime(28, now + 1.2);
  rumbleGain.gain.setValueAtTime(0.0, now);
  rumbleGain.gain.linearRampToValueAtTime(0.6, now + 0.05);
  rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
  rumbleOsc.connect(rumbleGain).connect(master);
  rumbleOsc.start(now);
  rumbleOsc.stop(now + 2.4);

  // 2. Choir swell on a wide major chord, starts ~0.8s in
  const chordStart = now + 0.8;
  const notes = [
    130.81, // C3
    196.0, // G3
    261.63, // C4
    329.63, // E4
    392.0, // G4
    523.25, // C5
  ];
  for (const f of notes) {
    for (const detune of [-7, 0, 7]) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      o.detune.value = detune;
      g.gain.setValueAtTime(0.0001, chordStart);
      g.gain.exponentialRampToValueAtTime(0.09, chordStart + 1.6);
      g.gain.exponentialRampToValueAtTime(0.0001, chordStart + 4.2);
      o.connect(g).connect(master);
      o.start(chordStart);
      o.stop(chordStart + 4.4);
    }
  }

  // 3. Bright "shine" higher overtone
  const shine = ctx.createOscillator();
  const shineG = ctx.createGain();
  shine.type = "triangle";
  shine.frequency.value = 1046.5; // C6
  shineG.gain.setValueAtTime(0.0001, chordStart + 0.4);
  shineG.gain.exponentialRampToValueAtTime(0.05, chordStart + 1.4);
  shineG.gain.exponentialRampToValueAtTime(0.0001, chordStart + 3.8);
  shine.connect(shineG).connect(master);
  shine.start(chordStart + 0.4);
  shine.stop(chordStart + 4);

  // Auto-close
  setTimeout(() => ctx.close().catch(() => {}), 6000);
}

function makeImpulseResponse(ctx: AudioContext, durationSec: number, decay: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = rate * durationSec;
  const impulse = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}
