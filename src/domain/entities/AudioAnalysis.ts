/**
 * AudioAnalysis — domain types for the DRM-safe FFT simulation.
 *
 * The Spotify Web Playback SDK does NOT expose raw PCM (DRM), so the
 * visualizers are driven from timed metadata instead. These types are the
 * pure-domain contract; the infrastructure engine implements them.
 */

export type VisualizerMode = "bars" | "oscilloscope" | "tunnel" | "wave" | "sphere";

/** One 60 FPS spectrum frame pushed into the store by the rAF loop. */
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

/** Analysis matrix for the active track, sourced from Spotify metadata. */
export interface AudioFeatures {
  id: string;
  uri: string;
  name?: string;
  duration_ms: number;
  tempo: number;
  energy: number;
  loudness: number;
  danceability: number;
  valence: number;
  key: number;
  mode: number;
  time_signature: number;
}

export interface AnalysisBar {
  start: number;
  duration: number;
  confidence: number;
}

export interface AnalysisBeat {
  start: number;
  duration: number;
  confidence: number;
}

export interface AnalysisSegment {
  start: number;
  duration: number;
  loudness_max: number;
  pitches: number[];
  timbre: number[];
}

export interface AnalysisData {
  trackId: string;
  durationMs: number;
  tempo: number;
  energy: number;
  loudness: number;
  bars: AnalysisBar[];
  beats: AnalysisBeat[];
  segments: AnalysisSegment[];
}

/** A zero-energy frame used as the initial/offline state. */
export const EMPTY_FRAME: SpectrumFrame = {
  bins: new Uint8Array(64),
  bass: 0,
  treble: 0,
  energy: 0,
  beat: 0,
  beatHit: false,
};
