import { create } from "zustand";
import {
  restoreSession,
  refreshAccessToken,
  clearTokens,
  type TokenResponse,
} from "../lib/spotify";

// Minimal shape of a Spotify track as returned by the Web Playback SDK.
export interface SpotifyTrack {
  name: string;
  uri: string;
  artists: { name: string }[];
  album: { name?: string; images: { url: string }[] };
  duration_ms: number;
}

interface SpotifyState {
  isAuthenticated: boolean;
  currentTrack: Partial<SpotifyTrack> | null;
  /** True while restoring session from encrypted storage */
  isRestoring: boolean;
  setAuth: (tokens: TokenResponse) => void;
  setTrack: (track: Partial<SpotifyTrack>) => void;
  logout: () => void;
  /** Attempt to restore a persisted session (called once on app boot) */
  restoreSession: () => Promise<void>;
  /** Get the current access token, refreshing if needed. Returns null if not authenticated. */
  getAccessToken: () => Promise<string | null>;
}

// Private closure — tokens are NEVER exposed on the store state object.
// This prevents `useSpotifyStore.getState().accessToken` or console inspection.
let _accessToken: string | null = null;
let _refreshToken: string | null = null;
let _expiresAt = 0;

// Scheduled refresh timer
let _refreshTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleRefresh(store: typeof useSpotifyStore) {
  if (_refreshTimer) clearTimeout(_refreshTimer);
  if (!_refreshToken || !_expiresAt) return;

  // Refresh 5 minutes before expiry
  const delay = Math.max((_expiresAt - Date.now() - 5 * 60 * 1000) | 0, 0);
  _refreshTimer = setTimeout(async () => {
    if (!_refreshToken) return;
    const result = await refreshAccessToken(_refreshToken);
    if (result) {
      _accessToken = result.accessToken;
      _refreshToken = result.refreshToken;
      _expiresAt = result.expiresAt;
      scheduleRefresh(store);
    } else {
      store.getState().logout();
    }
  }, delay);
}

export const useSpotifyStore = create<SpotifyState>()((set) => ({
  isAuthenticated: false,
  currentTrack: null,
  isRestoring: true,

  setAuth: (tokens) => {
    _accessToken = tokens.accessToken;
    _refreshToken = tokens.refreshToken;
    _expiresAt = tokens.expiresAt;
    set({ isAuthenticated: true, isRestoring: false });
    scheduleRefresh(useSpotifyStore);
  },

  setTrack: (track) => set({ currentTrack: track }),

  logout: () => {
    _accessToken = null;
    _refreshToken = null;
    _expiresAt = 0;
    if (_refreshTimer) clearTimeout(_refreshTimer);
    clearTokens();
    set({ isAuthenticated: false, currentTrack: null });
  },

  restoreSession: async () => {
    try {
      const tokens = await restoreSession();
      if (tokens) {
        _accessToken = tokens.accessToken;
        _refreshToken = tokens.refreshToken;
        _expiresAt = tokens.expiresAt;
        set({ isAuthenticated: true, isRestoring: false });
        scheduleRefresh(useSpotifyStore);
      } else {
        set({ isRestoring: false });
      }
    } catch {
      set({ isRestoring: false });
    }
  },

  getAccessToken: async () => {
    if (!_accessToken || !_refreshToken) return null;
    // If about to expire, refresh now
    if (_expiresAt - Date.now() < 60 * 1000) {
      const result = await refreshAccessToken(_refreshToken);
      if (result) {
        _accessToken = result.accessToken;
        _refreshToken = result.refreshToken;
        _expiresAt = result.expiresAt;
        scheduleRefresh(useSpotifyStore);
      } else {
        useSpotifyStore.getState().logout();
        return null;
      }
    }
    return _accessToken;
  },
}));
