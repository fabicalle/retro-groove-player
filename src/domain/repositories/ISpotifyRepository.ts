/**
 * ISpotifyRepository — the contract between the domain use cases and the
 * Spotify infrastructure (OAuth PKCE exchange + Web API + Web Playback SDK).
 *
 * Implementations live in `infrastructure/api/`. The domain layer only
 * depends on this interface, so the SDK can be swapped or mocked for tests.
 */

import type { Track } from "../entities/Track";
import type { Playlist } from "../entities/Playlist";
import type { AudioFeatures } from "../entities/AudioAnalysis";
import type { AnalysisData } from "../entities/AudioAnalysis";
import type { PlaybackCommand, TrackState } from "../entities/Session";

export interface SpotifyAuthResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface SpotifyPlaybackState {
  paused: boolean;
  position: number;
  duration: number;
  shuffle: boolean;
  track: TrackState | null;
  /** Raw SDK payload (track_window) — kept for compatibility with the
   *  presentation layer's existing shape. */
  track_window?: {
    current_track: {
      name: string;
      artists: { name: string }[];
      album: { images: { url: string }[] };
    };
  };
}

export interface ISpotifyRepository {
  // ── Auth ────────────────────────────────────────────────────────────
  /** Begin the OAuth2 PKCE redirect. Never resolves until the redirect happens. */
  redirectToAuth(): Promise<void>;
  /**
   * Exchange the authorisation code from the callback URL.
   * Returns the tokens, or `{ tokens: null, error }` with the real Spotify
   * error message (e.g. PKCE mismatch, expired code).
   */
  exchangeCode(code: string): Promise<{ tokens: SpotifyAuthResult | null; error: string | null }>;
  /** Refresh an expired access token. */
  refresh(refreshToken: string): Promise<SpotifyAuthResult | null>;
  /** Restore a persisted session. Null when no session exists. */
  restore(): Promise<SpotifyAuthResult | null>;

  // ── Premium ─────────────────────────────────────────────────────────
  /** True when the authenticated account can stream via the Web Playback SDK. */
  checkPremium(accessToken: string): Promise<{ isPremium: boolean; error: string | null }>;

  // ── Playback control (Web API) ───────────────────────────────────────
  play(command: PlaybackCommand): Promise<void>;
  pause(): Promise<void>;
  nextTrack(): Promise<void>;
  previousTrack(): Promise<void>;
  setVolume(volume01: number): Promise<void>;
  setShuffle(on: boolean): Promise<void>;

  // ── Data (Web API) ───────────────────────────────────────────────────
  fetchPlaylists(): Promise<Playlist[]>;
  fetchPlaylistTracks(playlistId: string): Promise<Track[]>;
  fetchAudioFeatures(trackId: string): Promise<AudioFeatures | null>;
  fetchAudioAnalysis(trackId: string): Promise<AnalysisData | null>;

  // ── Web Playback SDK lifecycle ───────────────────────────────────────
  /**
   * Lazily load the SDK and create the player. The returned object is
   * stable across mounts — callers subscribe to its events.
   */
  createPlayer(opts: { name: string; volume01: number }): Promise<unknown>;
  onPlayerReady(handler: (deviceId: string) => void): void;
  onNotPremium(handler: (message: string) => void): void;
  onPlayerStateChange(handler: (state: SpotifyPlaybackState) => void): void;
  disconnect(): void;
}
