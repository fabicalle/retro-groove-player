/**
 * useVisualizerStore — presentation-layer state for the visualizer.
 *
 * SRP: this store reasons about *how* audio is visualized (mode, spectrum
 * frame, bass/beat). It does NOT perform I/O — the domain use case
 * `ProcessFFTFrame` owns the FFT computation, and the audio engine hook
 * feeds frames into this store via `setFrame`.
 *
 * The 60 FPS frame is written imperatively from the rAF loop (outside
 * React's commit cycle) so components that read it never re-render per
 * frame. Components subscribe to coarse fields (mode, playing) only.
 */

import { create } from "zustand";
import type { SpectrumFrame, AnalysisData } from "@/domain/entities/AudioAnalysis";
import { EMPTY_FRAME } from "@/domain/entities/AudioAnalysis";

export type VisualizerMode = "bars" | "oscilloscope" | "tunnel" | "wave" | "sphere";

interface VisualizerState {
  frame: SpectrumFrame;
  analysis: AnalysisData | null;
  mode: VisualizerMode;
  running: boolean;
  bass: number;
  treble: number;
  beat: number;
  beatHit: boolean;
}

interface VisualizerActions {
  setFrame: (frame: SpectrumFrame) => void;
  setAnalysis: (analysis: AnalysisData | null) => void;
  setMode: (mode: VisualizerMode) => void;
  setRunning: (running: boolean) => void;
  reset: () => void;
}

export const useVisualizerStore = create<VisualizerState & VisualizerActions>()((set) => ({
  frame: EMPTY_FRAME,
  analysis: null,
  mode: "bars",
  running: false,
  bass: 0,
  treble: 0,
  beat: 0,
  beatHit: false,

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

export type VisualizerStore = VisualizerState & VisualizerActions;
