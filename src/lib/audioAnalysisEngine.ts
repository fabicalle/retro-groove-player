/**
 * AudioAnalysisEngine — DRM-safe FFT simulation for the retro visualizers.
 *
 * Spotify Web Playback SDK does NOT expose raw PCM to an AnalyserNode (DRM).
 * This engine instead drives the visualizers from Spotify's timed metadata:
 *   - `GET /v1/audio-features/{id}`   → tempo, energy, loudness, danceability
 *   - `GET /v1/audio-analysis/{id}`  → bars, beats, tatums, segments (pitches/timbre)
 *
 * It produces a synthetic `Uint8Array(64)` spectrum at 60 FPS that maps:
 *   - lows  (kick/bass)  ← beat/loudness/energy
 *   - mids  (body)       ← segment timbre
 *   - highs (treble)     ← segment pitches
 *
 * The engine is a singleton-ish module object: it holds the current track's
 * analysis matrix and exposes a single `tick(progressMs)` that returns the
 * spectrum for the current frame. React components subscribe to a Zustand
 * store that is updated once per rAF, so the renderers stay outside React's
 * commit cycle.
 */

export interface SpectrumFrame {
  /** 64-bin magnitude spectrum, 0..255 */
  bins: Uint8Array;
  /** Normalized 0..1 bass energy (kick detector) */
  bass: number;
  /** Normalized 0..1 treble energy */
  treble: number;
  /** Smoothed 0..1 overall loudness */
  energy: number;
  /** 0..1 beat pulse (decays each frame) */
  beat: number;
  /** True when a new beat boundary was crossed this frame */
  beatHit: boolean;
}

export interface AnalysisData {
  trackId: string;
  durationMs: number;
  tempo: number;
  energy: number;
  loudness: number;
  bars: Array<{ start: number; duration: number; confidence: number }>;
  beats: Array<{ start: number; duration: number; confidence: number }>;
  segments: Array<{
    start: number;
    duration: number;
    loudness_max: number;
    pitches: number[];
    timbre: number[];
  }>;
}

const FALLBACK_FEATURES = {
  tempo: 120,
  energy: 0.5,
  loudness: -10,
  bars: [{ start: 0, duration: 0.5, confidence: 1 }],
  beats: [{ start: 0, duration: 0.5, confidence: 1 }],
  segments: [
    {
      start: 0,
      duration: 4,
      loudness_max: 0,
      pitches: [0, 0, 0, 0, 0, 0, 0],
      timbre: [0, 0, 0, 0, 0, 0, 0],
    },
  ],
};

/** Smoothed state that persists between ticks (peak hold, decay). */
interface EngineState {
  data: AnalysisData;
  peaks: Float32Array; // 64 peak-hold values
  peakDecay: Float32Array; // per-bin decay rate
  lastBeatTime: number;
  beatPulse: number;
}

/** Single instance of the engine — persists across React remounts. */
let state: EngineState = makeState(FALLBACK_FEATURES as unknown as AnalysisData);

function makeState(data: AnalysisData): EngineState {
  return {
    data,
    peaks: new Float32Array(64),
    peakDecay: new Float32Array(64).fill(0.985),
    lastBeatTime: -1,
    beatPulse: 0,
  };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/**
 * Map a 0..1 value to a 0..255 byte with a slight gamma so lows are visible.
 */
function toByte(v: number): number {
  const g = Math.pow(clamp01(v), 1.6);
  return Math.round(g * 255);
}

/** Find the segment that contains the given playback position (ms). */
function currentSegment(ms: number): AnalysisData["segments"][number] | null {
  const segs = state.data.segments;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (ms >= s.start && ms < s.start + s.duration) return s;
  }
  // Fallback to last segment if position is past the end
  return segs.length ? segs[segs.length - 1] : null;
}

/** Find the beat closest to (and before) the given position. */
function currentBeat(ms: number): { start: number; duration: number } | null {
  const beats = state.data.beats;
  let best: { start: number; duration: number } | null = null;
  for (let i = 0; i < beats.length; i++) {
    const b = beats[i];
    if (b.start <= ms) best = b;
    else break;
  }
  return best;
}

/**
 * Compute the 64-bin spectrum for the current playback position.
 * Called once per rAF by the visualizer's render loop.
 */
export function tick(progressMs: number): SpectrumFrame {
  const data = state.data;
  const seg = currentSegment(progressMs);
  const beat = currentBeat(progressMs);

  // --- Bass / kick detection from beat boundaries ---
  let beatHit = false;
  if (beat && state.lastBeatTime !== beat.start) {
    state.lastBeatTime = beat.start;
    beatHit = true;
  }
  // Decay the beat pulse
  state.beatPulse *= 0.88;
  if (beatHit) state.beatPulse = 1;

  // --- Energy & loudness from segment + track-level features ---
  const segLoudness = seg ? clamp01((seg.loudness_max + 60) / 30) : 0.5;
  const trackEnergy = clamp01(data.energy);
  const energy = clamp01(0.6 * segLoudness + 0.4 * trackEnergy);

  // --- Build the 64-bin spectrum ---
  const bins = new Uint8Array(64);
  const pitches = seg?.pitches ?? FALLBACK_FEATURES.segments[0].pitches;
  const timbre = seg?.timbre ?? FALLBACK_FEATURES.segments[0].timbre;

  // Tempo-driven LFO for organic motion when no real audio is present.
  const tempoHz = Math.max(60, Math.min(200, data.tempo || 120));
  const lfo = 0.5 + 0.5 * Math.sin((progressMs / 1000) * (tempoHz / 60) * Math.PI * 2);

  // Lows (bins 0..15): kick + bass from beat pulse + energy
  const bassRaw = clamp01(0.7 * state.beatPulse + 0.3 * energy + 0.1 * lfo);
  for (let i = 0; i < 16; i++) {
    const env = bassRaw * (1 - i / 20);
    bins[i] = toByte(env);
  }

  // Mids (bins 16..47): body from timbre (7 values tiled)
  for (let i = 16; i < 48; i++) {
    const tt = timbre[(i - 16) % timbre.length] ?? 0;
    const ttNorm = clamp01(0.5 + tt / 10);
    const env = clamp01(0.5 * energy + 0.3 * ttNorm + 0.2 * lfo);
    bins[i] = toByte(env);
  }

  // Highs (bins 48..63): treble from pitches (7 values tiled)
  const trebleRaw = clamp01(
    0.4 * energy +
      0.3 * clamp01(pitches.reduce((a, b) => a + b, 0) / Math.max(1, pitches.length) / 12) +
      0.3 * lfo,
  );
  for (let i = 48; i < 64; i++) {
    const env = trebleRaw * (1 - (i - 48) / 24);
    bins[i] = toByte(env);
  }

  // --- Peak hold with gravity decay ---
  for (let i = 0; i < 64; i++) {
    const v = bins[i] / 255;
    if (v > state.peaks[i]) {
      state.peaks[i] = v;
    } else {
      // Gravity: decay faster when the gap is large
      const gap = state.peaks[i] - v;
      state.peaks[i] = Math.max(v, state.peaks[i] - gap * 0.06 - 0.004);
    }
  }

  const bass = clamp01(bassRaw);
  const treble = clamp01(trebleRaw);

  return { bins, bass, treble, energy, beat: state.beatPulse, beatHit };
}

/** Replace the analysis matrix (called when a new track starts playing). */
export function setData(data: AnalysisData): void {
  state = makeState(data);
}

/** Reset to defaults (offline / no track). */
export function reset(): void {
  state = makeState(FALLBACK_FEATURES as unknown as AnalysisData);
}

/** Current analysis metadata (for UI display). */
export function getData(): AnalysisData {
  return state.data;
}
