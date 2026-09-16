/**
 * usePlayerStore — presentation-layer state for playback.
 *
 * SRP: this store reasons about *what* is playing and *how* (track, position,
 * volume, shuffle, repeat). It does NOT perform I/O — the domain use cases
 * (PlayTrack, PlayPlaylist, ToggleShuffle) own the network calls, and the
 * route calls them. This store only holds the resulting state.
 */

import { create } from "zustand";
import type { Track } from "@/domain/entities/Track";

export type PlaybackStatus = "idle" | "loading" | "playing" | "paused" | "error";

interface PlayerState {
  status: PlaybackStatus;
  currentTrack: Track | null;
  position: number; // ms
  duration: number; // ms
  volume: number; // 0..1
  muted: boolean;
  shuffle: boolean;
  repeat: number; // 0 = off, 1 = all, 2 = one
  error: string | null;
}

interface PlayerActions {
  setTrack: (track: Track | null) => void;
  setStatus: (status: PlaybackStatus) => void;
  setPosition: (position: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setShuffle: (on: boolean) => void;
  setRepeat: (mode: number) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const usePlayerStore = create<PlayerState & PlayerActions>()((set) => ({
  status: "idle",
  currentTrack: null,
  position: 0,
  duration: 0,
  volume: 0.75,
  muted: false,
  shuffle: false,
  repeat: 0,
  error: null,

  setTrack: (track) => set({ currentTrack: track, status: track ? "loading" : "idle" }),
  setStatus: (status) => set({ status }),
  setPosition: (position) => set({ position }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  setShuffle: (shuffle) => set({ shuffle }),
  setRepeat: (repeat) => set({ repeat }),
  setError: (error) => set({ error, status: error ? "error" : "idle" }),
  reset: () =>
    set({
      status: "idle",
      currentTrack: null,
      position: 0,
      duration: 0,
      shuffle: false,
      repeat: 0,
      error: null,
    }),
}));

export type PlayerStore = PlayerState & PlayerActions;
