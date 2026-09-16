/**
 * useAudioStore — Zustand store that decouples the 60 FPS audio render
 * loop from React's commit lifecycle.
 *
 * Pattern:
 *   - The visualizer's `useEffect` rAF loop reads
 *     `useAudioStore.getState().frame` imperatively → NO React re-render.
 *   - `setFrame` is called from the rAF loop directly (outside React).
 *   - Components subscribe ONLY to coarse fields (analysis metadata,
 *     mode, playing) and re-render only when those change.
 */

import { create } from "zustand";
import type { SpectrumFrame, AnalysisData } from "../lib/audioAnalysisEngine";

export type VisualizerMode = "bars" | "oscilloscope" | "tunnel" | "wave" | "sphere";

interface AudioState {
  /** Latest spectrum frame, updated by the rAF loop (imperative read). */
  frame: SpectrumFrame | null;
  /** Current analysis matrix for the active track. */
  analysis: AnalysisData | null;
  /** Active visualizer mode (Winamp bars / oscilloscope / PS1 modes). */
  mode: VisualizerMode;
  /** Whether the engine is currently running. */
  running: boolean;
  /** Smoothed 0..1 bass energy (for PS1 bass-kick reactivity). */
  bass: number;
  /** Smoothed 0..1 treble energy. */
  treble: number;
  /** 0..1 beat pulse (decays). */
  beat: number;
  /** True when a beat boundary was hit this frame. */
  beatHit: boolean;
  /** Master volume 0..1 (from Winamp slider). */
  volume: number;
  /** Muted flag. */
  muted: boolean;
}

interface AudioActions {
  setFrame: (frame: SpectrumFrame) => void;
  setAnalysis: (analysis: AnalysisData | null) => void;
  setMode: (mode: VisualizerMode) => void;
  setRunning: (running: boolean) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  /** Reset to defaults (offline / no track). */
  reset: () => void;
}

const EMPTY_FRAME: SpectrumFrame = {
  bins: new Uint8Array(64),
  bass: 0,
  treble: 0,
  energy: 0,
  beat: 0,
  beatHit: false,
};

export const useAudioStore = create<AudioState & AudioActions>()((set) => ({
  frame: EMPTY_FRAME,
  analysis: null,
  mode: "bars",
  running: false,
  bass: 0,
  treble: 0,
  beat: 0,
  beatHit: false,
  volume: 0.75,
  muted: false,

  setFrame: (frame) =>
    set({
      frame,
      bass: frame.bass,
      treble: frame.treble,
      beat: frame.beat,
      beatHit: frame.beatHit,
    }),
  setAnalysis: (analysis) => set({ analysis }),
  setMode: (mode) => set({ mode }),
  setRunning: (running) => set({ running }),
  setVolume: (volume) => set({ volume }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  reset: () =>
    set({
      frame: EMPTY_FRAME,
      analysis: null,
      mode: "bars",
      running: false,
      bass: 0,
      treble: 0,
      beat: 0,
      beatHit: false,
    }),
}));

// Selector helpers (shallow) so components subscribe to coarse slices.
export function useSpectrumFrame() {
  return useAudioStore((s) => s.frame);
}
export function useAudioAnalysis() {
  return useAudioStore((s) => s.analysis);
}
export function useAudioMode() {
  return useAudioStore((s) => s.mode);
}
export function useBassBeat() {
  return useAudioStore((s) => ({ bass: s.bass, beat: s.beat, beatHit: s.beatHit }));
}
