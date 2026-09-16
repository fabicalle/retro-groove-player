/**
 * Session — domain models for authentication, premium status, and playback.
 *
 * Tokens themselves live in the infrastructure storage layer, never in
 * these entities. What the domain cares about is *whether* a session exists
 * and *what it can do* (stream audio → requires Premium).
 */

export type PremiumStatus = "unknown" | "premium" | "free_tier";

/** The parts of a Spotify session the UI and use cases need to reason about. */
export interface AuthSession {
  isAuthenticated: boolean;
  isPremium: PremiumStatus;
  /** User-facing error banner (Premium missing, token expired, OAuth denied). */
  error: string | null;
}

export type PlaybackState = "idle" | "loading" | "playing" | "paused" | "error";

export interface PlaybackCommand {
  /** Spotify device id the command targets, or null = default device. */
  deviceId?: string | null;
  /** When set, starts a playlist context; otherwise plays a single track. */
  contextUri?: string;
  /** Track to start on when using a context. */
  offsetUri?: string;
  /** Explicit list of track URIs when no context is used. */
  uris?: string[];
}

/** Map a Spotify Web SDK `player_state_changed` payload into a domain type. */
export interface TrackState {
  name: string;
  artists: { name: string }[];
  album: { images: { url: string }[] };
}
