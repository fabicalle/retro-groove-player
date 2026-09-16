/**
 * ProcessFFTFrame — advance the DRM-safe FFT simulation by one frame.
 *
 * The Spotify Web Playback SDK does not expose raw PCM, so the visualizers
 * are driven from timed metadata. This use case is the single place that
 * calls the audio engine; components never touch it directly.
 */

import type { IAudioEngine } from "../repositories/IAudioEngine";
import type { SpectrumFrame } from "../entities/AudioAnalysis";

export interface ProcessFFTFrameRequest {
  /** Playback position in ms into the current track. */
  progressMs: number;
}

export type ProcessFFTFrameOutcome =
  | { ok: true; frame: SpectrumFrame }
  | { ok: false; error: string };

export class ProcessFFTFrame {
  constructor(private readonly engine: IAudioEngine) {}

  execute(request: ProcessFFTFrameRequest): ProcessFFTFrameOutcome {
    try {
      const frame = this.engine.tick(request.progressMs);
      return { ok: true, frame };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "FFT tick failed" };
    }
  }
}
