/**
 * IAudioEngine — contract for the DRM-safe FFT simulation engine.
 *
 * The Spotify Web Playback SDK does not expose raw PCM, so the visualizers
 * are driven from timed metadata. This interface is the domain boundary:
 * the infrastructure engine implements it, and the use case / presentation
 * layers only depend on the contract.
 */

import type { SpectrumFrame, AnalysisData, AudioFeatures } from "../entities/AudioAnalysis";

export interface IAudioEngine {
  /** Feed a track's audio-features + analysis matrix into the engine. */
  load(trackId: string, features: AudioFeatures, analysis: AnalysisData): void;
  /** Advance one frame. Returns the spectrum for `progressMs` into the track. */
  tick(progressMs: number): SpectrumFrame;
  /** Reset the engine to silence. */
  reset(): void;
  /** Current track id, or null when nothing is loaded. */
  getCurrentTrackId(): string | null;
}
