/**
 * useAuthStore — presentation-layer state machine for the app lifecycle.
 *
 * Explicit states:
 *   'BOOTING'  → restoring session / exchanging OAuth code. Nothing rendered.
 *   'READY'    → the player is available. Renders Winamp/PS1.
 *   'ERROR'    → an unrecoverable auth error. Renders the error screen.
 *
 * This store is the SINGLE place that decides whether the PS1 boot intro
 * plays. The route reads `status` + `bootCompleted` from here and renders
 * accordingly — it never inspects the URL or tokens directly.
 *
 * SRP: this store reasons about auth state only. Playback state lives in
 * `usePlayerStore`; visualizer state in `useVisualizerStore`.
 *
 * Note: the store does NOT call hooks. The route calls `useSpotifyAuth`
 * (which owns URL/session logic) and feeds the derived values into this
 * store via `sync()`. This keeps the store framework-agnostic and testable.
 */

import { create } from "zustand";
import type { ISpotifyRepository } from "@/domain/repositories/ISpotifyRepository";
import { SpotifyApi } from "@/infrastructure/api/SpotifyApi";

export type AuthStatus = "BOOTING" | "READY" | "ERROR";

interface AuthState {
  status: AuthStatus;
  isAuthenticated: boolean;
  isPremium: boolean;
  error: string | null;
  /** True once the PS1 boot intro has been shown this session. */
  bootCompleted: boolean;
}

interface AuthActions {
  /** Push the latest auth values from the route (called on every render). */
  sync: (input: {
    isRestoring: boolean;
    isCallback: boolean;
    isAuthenticated: boolean;
    isPremium: boolean;
    error: string | null;
  }) => void;
  /** User pressed POWER on the PS1 boot screen. */
  completeBoot: () => void;
  /** User clicked CONNECT. */
  connect: () => Promise<void>;
  /** User clicked DISCONNECT. */
  logout: () => Promise<void>;
  setError: (error: string | null) => void;
}

// Singleton infrastructure — created once so the SDK player persists
// across remounts. DI: the repository is injectable for testing.
let _repository: ISpotifyRepository | null = null;
function getRepository(): ISpotifyRepository {
  if (!_repository) _repository = new SpotifyApi();
  return _repository;
}

export const useAuthStore = create<AuthState & AuthActions>()((set, get) => ({
  status: "BOOTING",
  isAuthenticated: false,
  isPremium: false,
  error: null,
  bootCompleted: false,

  sync: ({ isRestoring, isCallback, isAuthenticated, isPremium, error }) => {
    const prev = get();
    let status: AuthStatus;
    if (isRestoring || isCallback) {
      status = "BOOTING";
    } else if (isAuthenticated) {
      status = "READY";
    } else if (prev.bootCompleted) {
      status = "READY";
    } else {
      // Fresh session, not authenticated → the route renders the PS1 boot screen.
      status = "BOOTING";
    }
    if (
      prev.status !== status ||
      prev.isAuthenticated !== isAuthenticated ||
      prev.isPremium !== isPremium ||
      prev.error !== error
    ) {
      set({ status, isAuthenticated, isPremium, error });
    }
  },

  completeBoot: () => set({ bootCompleted: true, status: "READY" }),

  connect: async () => {
    set({ status: "BOOTING", error: null });
    const repo = getRepository();
    // redirectToAuth navigates away; the OAuth callback will re-init the app.
    await repo.redirectToAuth();
  },

  logout: async () => {
    const repo = getRepository();
    repo.disconnect();
    set({
      isAuthenticated: false,
      isPremium: false,
      status: "BOOTING",
      error: null,
      bootCompleted: false,
    });
  },

  setError: (error) => set({ error, status: error ? "ERROR" : "READY" }),
}));
