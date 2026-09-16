/**
 * SpotifyApi — infrastructure adapter implementing ISpotifyRepository.
 *
 * Owns ALL Spotify HTTP/Web-SDK interaction: OAuth2 PKCE, Web API calls,
 * and the lazy Web Playback SDK. The domain layer only depends on the
 * interface; this is the only place that talks to Spotify.
 */

import type {
  ISpotifyRepository,
  SpotifyAuthResult,
  SpotifyPlaybackState,
  PlaybackCommand,
} from "@/domain/repositories/ISpotifyRepository";
import type { Playlist } from "@/domain/entities/Playlist";
import type { Track, trackFromSpotify } from "@/domain/entities/Track";
import type { AudioFeatures } from "@/domain/entities/AudioAnalysis";
import type { AnalysisData } from "@/domain/entities/AudioAnalysis";
import type { ITokenStorage } from "./ITokenStorage";
import { EncryptedTokenStorage } from "../storage/EncryptedTokenStorage";
import { checkPremium } from "@/lib/spotify-premium";
import {
  fetchAudioFeatures,
  fetchAudioAnalysis,
  getAuthErrorFromUrl,
  isOnCallbackUrl,
  clearOAuthParams,
  describeAuthError,
} from "@/lib/spotify";
import type { IAudioEngine } from "@/domain/repositories/IAudioEngine";
import type { SpectrumFrame, AnalysisData, AudioFeatures } from "@/domain/entities/AudioAnalysis";
import * as engine from "@/lib/audioAnalysisEngine";

const SPOTIFY_CLIENT_ID =
  import.meta.env.VITE_SPOTIFY_CLIENT_ID || "3c0927072be14e52b19aadf73d00e0de";
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || "http://127.0.0.1:8080/";
const SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-library-read",
  "user-read-currently-playing",
].join(" ");

function generateRandomString(length: number): string {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (v) => possible[v % possible.length]).join("");
}

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  try {
    const digest = await crypto.subtle.digest("SHA-256", data);
    return toBase64Url(new Uint8Array(digest));
  } catch {
    return toBase64Url(sha256Fallback(data));
  }
}

// Pure-JS SHA-256 fallback when crypto.subtle is unavailable.
function sha256Fallback(message: Uint8Array): Uint8Array {
  const K: number[] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const rr = (v: number, n: number) => (v >>> n) | (v << (32 - n));
  const len = message.length;
  const bitLen = len * 8;
  const padded = new Uint8Array((len + 9 + 63) & ~63);
  padded.set(message);
  padded[len] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, bitLen, false);
  let [h0, h1, h2, h3, h4, h5, h6, h7] = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const w = new Int32Array(64);
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getInt32(off + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = rr(w[i - 15]!, 7) ^ rr(w[i - 15]!, 18) ^ (w[i - 15]! >>> 3);
      const s1 = rr(w[i - 2]!, 17) ^ rr(w[i - 2]!, 19) ^ (w[i - 2]! >>> 10);
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) | 0;
    }
    let [a, b, c, d, e, f, g, h] = [h0, h1, h2, h3, h4, h5, h6, h7];
    for (let i = 0; i < 64; i++) {
      const S1 = rr(e, 6) ^ rr(e, 11) ^ rr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i]! + w[i]!) | 0;
      const S0 = rr(a, 2) ^ rr(a, 13) ^ rr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }
    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }
  const out = new Uint8Array(32);
  const ov = new DataView(out.buffer);
  [h0, h1, h2, h3, h4, h5, h6, h7].forEach((v, i) => ov.setUint32(i * 4, v, false));
  return out;
}

// ── SpotifyApi adapter ────────────────────────────────────────────────────

export interface SpotifyApiConfig {
  clientId?: string;
  redirectUri?: string;
  scopes?: string;
  storage?: ITokenStorage;
}

interface PlaylistApi {
  items?: SpotifyApiPlaylistItem[];
}

interface SpotifyApiPlaylistItem {
  id: string;
  name: string;
  images: { url: string }[];
  tracks: { total: number };
  owner: { display_name: string };
}

interface PlaylistTrackApi {
  next: string | null;
  items: Array<{ track: SpotifyApiTrackItem | null }>;
}

interface SpotifyApiTrackItem {
  id: string | null;
  name: string;
  uri: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
  duration_ms: number;
}

interface SpotifySdkPlayerState {
  paused: boolean;
  position: number;
  duration: number;
  shuffle: boolean;
  track_window?: {
    current_track: {
      name: string;
      artists: { name: string }[];
      album: { images: { url: string }[] };
    };
  };
}

interface SpotifySdkReadyEvent {
  device_id: string;
}

interface SpotifySdkErrorEvent {
  message?: string;
}

export class SpotifyApi implements ISpotifyRepository {
  private readonly clientId: string;
  private readonly redirectUri: string;
  private readonly scopes: string;
  private readonly storage: ITokenStorage;
  private player: unknown = null;
  private readonly handlers = {
    ready: [] as Array<(deviceId: string) => void>,
    notPremium: [] as Array<(message: string) => void>,
    state: [] as Array<(state: SpotifyPlaybackState) => void>,
  };

  constructor(config: SpotifyApiConfig = {}) {
    this.clientId = config.clientId || SPOTIFY_CLIENT_ID;
    this.redirectUri = config.redirectUri || REDIRECT_URI;
    this.scopes = config.scopes || SCOPES;
    this.storage = config.storage || new EncryptedTokenStorage();
  }

  // ── Auth ──────────────────────────────────────────────────────────────
  async redirectToAuth(): Promise<void> {
    const verifier = generateRandomString(128);
    const challenge = await generateCodeChallenge(verifier);
    sessionStorage.setItem("spotify_verifier", verifier);
    const authUrl = new URL("https://accounts.spotify.com/authorize");
    authUrl.searchParams.append("client_id", this.clientId);
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("redirect_uri", this.redirectUri);
    authUrl.searchParams.append("scope", this.scopes);
    authUrl.searchParams.append("code_challenge_method", "S256");
    authUrl.searchParams.append("code_challenge", challenge);
    window.location.href = authUrl.toString();
  }

  async exchangeCode(
    code: string,
  ): Promise<{ tokens: SpotifyAuthResult | null; error: string | null }> {
    const verifier = sessionStorage.getItem("spotify_verifier");
    if (!verifier) {
      return { tokens: null, error: "No PKCE verifier in session — restart the login flow." };
    }
    const payload = new URLSearchParams();
    payload.append("client_id", this.clientId);
    payload.append("grant_type", "authorization_code");
    payload.append("code", code);
    payload.append("redirect_uri", this.redirectUri);
    payload.append("code_verifier", verifier);
    sessionStorage.removeItem("spotify_verifier");
    try {
      const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: payload,
      });
      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body?.error) {
            detail = `${body.error}${body.error_description ? `: ${body.error_description}` : ""}`;
          }
        } catch {
          /* ignore */
        }
        return { tokens: null, error: `Token exchange failed (${detail})` };
      }
      const data = await res.json();
      if (!data.access_token || !data.refresh_token) {
        return { tokens: null, error: "Spotify response missing access_token/refresh_token" };
      }
      const tokens: SpotifyAuthResult = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
      };
      await this.storage.save(tokens);
      return { tokens, error: null };
    } catch (err) {
      return {
        tokens: null,
        error: err instanceof Error ? err.message : "Network error during token exchange",
      };
    }
  }

  async refresh(refreshToken: string): Promise<SpotifyAuthResult | null> {
    const payload = new URLSearchParams();
    payload.append("client_id", this.clientId);
    payload.append("grant_type", "refresh_token");
    payload.append("refresh_token", refreshToken);
    try {
      const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: payload,
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.access_token) return null;
      const tokens: SpotifyAuthResult = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
      };
      await this.storage.save(tokens);
      return tokens;
    } catch {
      return null;
    }
  }

  async restore(): Promise<SpotifyAuthResult | null> {
    return this.storage.load();
  }

  // ── Premium ───────────────────────────────────────────────────────────
  async checkPremium(accessToken: string): Promise<{ isPremium: boolean; error: string | null }> {
    return checkPremium(accessToken);
  }

  // ── Playback control (Web API) ────────────────────────────────────────
  private async webApi(path: string, init: RequestInit = {}): Promise<void> {
    const token = await this.getAccessToken();
    if (!token) throw new Error("Not authenticated");
    const res = await fetch(`https://api.spotify.com/v1/me/player${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(init.headers as Record<string, string>),
      },
    });
    if (res.status === 401) throw new Error("Token expired");
    if (res.status === 403) {
      const body = await res.text();
      throw new Error(`Spotify API 403: ${body}`);
    }
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Spotify API ${res.status}: ${body}`);
    }
  }

  async play(command: PlaybackCommand): Promise<void> {
    const params = command.deviceId ? `?device_id=${command.deviceId}` : "";
    const body: Record<string, unknown> = {};
    if (command.contextUri) {
      body.context_uri = command.contextUri;
      if (command.offsetUri) body.offset = { uri: command.offsetUri };
    } else if (command.uris) {
      body.uris = command.uris;
    }
    await this.webApi(`/play${params}`, { method: "PUT", body: JSON.stringify(body) });
  }

  async pause(): Promise<void> {
    await this.webApi("/pause", { method: "PUT" });
  }

  async nextTrack(): Promise<void> {
    await this.webApi("/next", { method: "POST" });
  }

  async previousTrack(): Promise<void> {
    await this.webApi("/previous", { method: "POST" });
  }

  async setVolume(volume01: number): Promise<void> {
    const v = Math.max(0, Math.min(1, volume01));
    await this.webApi(`/volume?volume_percent=${Math.round(v * 100)}`, { method: "PUT" });
  }

  async setShuffle(on: boolean): Promise<void> {
    await this.webApi(`/shuffle?state=${on}`, { method: "PUT" });
  }

  // ── Data (Web API) ────────────────────────────────────────────────────
  private async apiGet<T>(path: string): Promise<T | null> {
    const token = await this.getAccessToken();
    if (!token) return null;
    const res = await fetch(`https://api.spotify.com/v1${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) throw new Error("Token expired");
    if (res.status === 403) {
      const body = await res.text();
      throw new Error(`Spotify API 403: ${body}`);
    }
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Spotify API ${res.status}: ${body}`);
    }
    return (await res.json()) as T;
  }

  async fetchPlaylists(): Promise<Playlist[]> {
    const data = await this.apiGet<PlaylistApi>("/me/playlists?limit=50");
    if (!data) return [];
    return (data.items ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      images: p.images ?? [],
      tracks: { total: p.tracks?.total ?? 0 },
      owner: { display_name: p.owner?.display_name ?? "" },
      uri: `spotify:playlist:${p.id}`,
    }));
  }

  async fetchPlaylistTracks(playlistId: string): Promise<Track[]> {
    const all: Track[] = [];
    let next: string | null = `/playlists/${playlistId}/tracks?limit=100`;
    while (next) {
      const data = await this.apiGet<PlaylistTrackApi>(next);
      if (!data) break;
      for (const item of data.items ?? []) {
        const track = trackFromSpotify(item.track);
        if (track) all.push(track);
      }
      next = data.next ?? null;
    }
    return all;
  }

  async fetchAudioFeatures(trackId: string): Promise<AudioFeatures | null> {
    return fetchAudioFeatures(await this.getAccessToken()!, trackId);
  }

  async fetchAudioAnalysis(trackId: string): Promise<AnalysisData | null> {
    const raw = await fetchAudioAnalysis(await this.getAccessToken()!, trackId);
    if (!raw) return null;
    return {
      trackId,
      durationMs: raw.track.duration_ms,
      tempo: raw.track.tempo,
      energy: 0.5,
      loudness: raw.track.loudness,
      bars: raw.bars,
      beats: raw.beats,
      segments: raw.segments.map((s) => ({
        start: s.start,
        duration: s.duration,
        loudness_max: s.loudness_max,
        pitches: s.pitches,
        timbre: s.timbre,
      })),
    };
  }

  // ── Web Playback SDK lifecycle ────────────────────────────────────────
  private async getAccessToken(): Promise<string | null> {
    const stored = await this.storage.load();
    if (!stored) return null;
    if (stored.expiresAt - Date.now() < 60 * 1000) {
      const refreshed = await this.refresh(stored.refreshToken);
      if (!refreshed) return null;
      return refreshed.accessToken;
    }
    return stored.accessToken;
  }

  async createPlayer(opts: { name: string; volume01: number }): Promise<unknown> {
    if (this.player) return this.player;
    const player = new window.Spotify.Player({
      name: opts.name,
      getOAuthToken: async (cb: (token: string) => void) => {
        const token = await this.getAccessToken();
        if (token) cb(token);
      },
      volume: opts.volume01,
    });
    this.player = player;

    player.addListener("ready", (e: SpotifySdkReadyEvent) => {
      this.handlers.ready.forEach((h) => h(e.device_id));
    });
    player.addListener("not_premium", (err?: SpotifySdkErrorEvent) => {
      this.handlers.notPremium.forEach((h) =>
        h(err?.message ?? "Free-tier account — Spotify Web Playback requires Premium."),
      );
    });
    player.addListener("player_state_changed", (raw: SpotifySdkPlayerState | null) => {
      if (!raw) return;
      const current = raw.track_window?.current_track;
      const state: SpotifyPlaybackState = {
        paused: raw.paused,
        position: raw.position,
        duration: raw.duration,
        shuffle: raw.shuffle,
        track: current
          ? {
              name: current.name,
              artists: Array.isArray(current.artists) ? current.artists : [],
              album: current.album ?? { images: [] },
            }
          : null,
      };
      this.handlers.state.forEach((h) => h(state));
    });
    player.connect();
    return player;
  }

  onPlayerReady(handler: (deviceId: string) => void): void {
    this.handlers.ready.push(handler);
  }
  onNotPremium(handler: (message: string) => void): void {
    this.handlers.notPremium.push(handler);
  }
  onPlayerStateChange(handler: (state: SpotifyPlaybackState) => void): void {
    this.handlers.state.push(handler);
  }
  disconnect(): void {
    if (this.player) {
      (this.player as { disconnect: () => void }).disconnect();
      this.player = null;
    }
  }
}

export { getAuthErrorFromUrl, isOnCallbackUrl, clearOAuthParams, describeAuthError };

// ── Audio engine adapter ──────────────────────────────────────────────────

/**
 * FFTAnalysisEngine — infrastructure adapter implementing IAudioEngine.
 *
 * Wraps the DRM-safe FFT simulation engine (which derives a 64-bin spectrum
 * from Spotify metadata, since the Web Playback SDK does not expose raw PCM).
 * The domain use case `ProcessFFTFrame` only depends on the interface.
 */
export class FFTAnalysisEngine implements IAudioEngine {
  load(_trackId: string, _features: AudioFeatures, analysis: AnalysisData): void {
    engine.setData(analysis);
  }

  tick(progressMs: number): SpectrumFrame {
    return engine.tick(progressMs);
  }

  reset(): void {
    engine.reset();
  }

  getCurrentTrackId(): string | null {
    return engine.getData().trackId;
  }
}
