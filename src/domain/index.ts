/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  DOMAIN LAYER — pure business logic, zero framework/IO dependencies   ║
 * ║                                                                     ║
 * ║  This package knows nothing about React, fetch, localStorage,       ║
 * ║  Three.js, or the Spotify Web SDK. It only defines entities,        ║
 * ║  repository contracts (interfaces), and use cases.                  ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

// ── Entities ──────────────────────────────────────────────────────────────
export { type Track, type TrackId, type Artist, type Album } from "./entities/Track";
export { type Playlist, type PlaylistId } from "./entities/Playlist";
export { type User, type UserId } from "./entities/User";
export {
  type VisualizerMode,
  type VisualizerState,
  type SpectrumFrame,
  type AnalysisData,
  type AudioFeatures,
} from "./entities/AudioAnalysis";
export {
  type AuthSession,
  type AuthState,
  type PremiumStatus,
  type PlaybackState,
} from "./entities/Session";

// ── Repository contracts ──────────────────────────────────────────────────
export type {
  ISpotifyRepository,
  SpotifyAuthResult,
  SpotifyPlaybackCommand,
} from "./repositories/ISpotifyRepository";
export type { IAudioEngine } from "./repositories/IAudioEngine";
export type { ITokenStorage } from "./repositories/ITokenStorage";

// ── Use cases ─────────────────────────────────────────────────────────────
export { AuthenticateUser } from "./usecases/AuthenticateUser";
export { FetchPlaylists } from "./usecases/FetchPlaylists";
export { FetchPlaylistTracks } from "./usecases/FetchPlaylistTracks";
export { PlayTrack } from "./usecases/PlayTrack";
export { PlayPlaylist } from "./usecases/PlayPlaylist";
export { ToggleShuffle } from "./usecases/ToggleShuffle";
export { ProcessFFTFrame } from "./usecases/ProcessFFTFrame";
export { DetectPremium } from "./usecases/DetectPremium";
export { RestoreSession } from "./usecases/RestoreSession";
export { LogoutUser } from "./usecases/LogoutUser";
