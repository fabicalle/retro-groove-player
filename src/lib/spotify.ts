import { saveTokens, loadTokens, clearTokens, type SecureTokenData } from "./secure-storage";

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

// --- PKCE helpers ---
function generateRandomString(length: number) {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (v) => possible[v % possible.length]).join("");
}

// Pure-JS SHA-256 fallback when crypto.subtle is unavailable
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
  // Pre-processing: pad message
  const len = message.length;
  const bitLen = len * 8;
  const padded = new Uint8Array((len + 9 + 63) & ~63);
  padded.set(message);
  padded[len] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, bitLen, false);
  // Hash
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

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const data = new TextEncoder().encode(codeVerifier);
  try {
    // Prefer native crypto.subtle when available
    const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
    return toBase64Url(new Uint8Array(digest));
  } catch {
    // Fallback: pure JS SHA-256
    return toBase64Url(sha256Fallback(data));
  }
}

// --- Auth flow ---
export const redirectToSpotify = async () => {
  const verifier = generateRandomString(128);
  const challenge = await generateCodeChallenge(verifier);

  sessionStorage.setItem("spotify_verifier", verifier);

  const authUrl = new URL("https://accounts.spotify.com/authorize");
  authUrl.searchParams.append("client_id", SPOTIFY_CLIENT_ID);
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.append("scope", SCOPES);
  authUrl.searchParams.append("code_challenge_method", "S256");
  authUrl.searchParams.append("code_challenge", challenge);

  window.location.href = authUrl.toString();
};

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface TokenExchangeResult {
  tokens: TokenResponse | null;
  error: string | null;
}

/**
 * Exchange an OAuth2 `code` for access/refresh tokens (PKCE).
 *
 * Returns `{ tokens, error }` instead of just `null` on failure so the
 * caller can surface the real Spotify error message (e.g. PKCE mismatch,
 * redirect_uri mismatch, expired code). This is what surfaces the 400
 * "Invalid verification code" instead of a silent null.
 */
export const getTokenFromCode = async (code: string): Promise<TokenExchangeResult> => {
  const verifier = sessionStorage.getItem("spotify_verifier");
  if (!verifier) {
    return { tokens: null, error: "No PKCE verifier in session — restart the login flow." };
  }

  const payload = new URLSearchParams();
  payload.append("client_id", SPOTIFY_CLIENT_ID);
  payload.append("grant_type", "authorization_code");
  payload.append("code", code);
  payload.append("redirect_uri", REDIRECT_URI);
  payload.append("code_verifier", verifier);

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: payload,
    });

    // Always clean the verifier — even on failure — so a retry starts fresh
    sessionStorage.removeItem("spotify_verifier");

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const body = await response.json();
        if (body?.error) {
          detail = `${body.error}${body.error_description ? `: ${body.error_description}` : ""}`;
        }
      } catch {
        // ignore body parse failure
      }
      return { tokens: null, error: `Token exchange failed (${detail})` };
    }

    const data = await response.json();
    if (!data.access_token || !data.refresh_token) {
      return { tokens: null, error: "Spotify response missing access_token/refresh_token" };
    }

    const tokens: SecureTokenData = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    };

    await saveTokens(tokens);
    return { tokens, error: null };
  } catch (err) {
    sessionStorage.removeItem("spotify_verifier");
    return {
      tokens: null,
      error: err instanceof Error ? err.message : "Network error during token exchange",
    };
  }
};

export const refreshAccessToken = async (refreshToken: string): Promise<TokenResponse | null> => {
  const payload = new URLSearchParams();
  payload.append("client_id", SPOTIFY_CLIENT_ID);
  payload.append("grant_type", "refresh_token");
  payload.append("refresh_token", refreshToken);

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: payload,
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.access_token) return null;

    const tokens: SecureTokenData = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    };

    await saveTokens(tokens);
    return tokens;
  } catch {
    return null;
  }
};

/**
 * Try to restore a valid session from encrypted storage.
 * Automatically refreshes if the token is expired or about to expire.
 */
export const restoreSession = async (): Promise<TokenResponse | null> => {
  const stored = await loadTokens();
  if (!stored) return null;

  // If token expires in less than 5 minutes, refresh it
  if (stored.expiresAt - Date.now() < 5 * 60 * 1000) {
    return refreshAccessToken(stored.refreshToken);
  }

  return {
    accessToken: stored.accessToken,
    refreshToken: stored.refreshToken,
    expiresAt: stored.expiresAt,
  };
};

export { clearTokens };

/**
 * Spotify OAuth2 error payload (returned in the URL as `?error=...`).
 * When the user denies consent or the flow is aborted, Spotify redirects
 * back to `REDIRECT_URI` with `error=access_denied` instead of `code=...`.
 */
export interface SpotifyAuthError {
  error: string;
  errorDescription: string | null;
}

/**
 * Inspect the current URL for an OAuth2 error response.
 * Returns the parsed error or null if the URL is clean.
 */
export function getAuthErrorFromUrl(): SpotifyAuthError | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");
  if (!error) return null;
  return {
    error,
    errorDescription: params.get("error_description"),
  };
}

/**
 * True when the current URL contains an OAuth2 response parameter
 * (`code` or `access_token`). Used to prevent the auth guard from
 * re-triggering a redirect while the callback is still being processed.
 */
export function isOnCallbackUrl(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hashParams = new URLSearchParams(hash);
  return Boolean(
    params.get("code") ||
    params.get("access_token") ||
    hashParams.get("access_token") ||
    params.get("error"),
  );
}

/**
 * Strip all OAuth2 response parameters from the URL without reloading.
 * Safe to call multiple times — a clean URL is a no-op.
 * Non-OAuth query parameters (e.g. TanStack Router search params) are kept.
 */
export function clearOAuthParams(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const kept = new URLSearchParams();
  for (const [k, v] of params.entries()) {
    if (
      k !== "code" &&
      k !== "access_token" &&
      k !== "error" &&
      k !== "error_description" &&
      k !== "state"
    ) {
      kept.set(k, v);
    }
  }
  const newQuery = kept.toString();
  const newUrl = window.location.pathname + (newQuery ? `?${newQuery}` : "") + window.location.hash;
  window.history.replaceState({}, document.title, newUrl);
}

/**
 * Map a Spotify OAuth error code to a human-readable message.
 * Shared by the auth hook and the UI banner so the wording never drifts.
 */
export function describeAuthError(e: { error: string; errorDescription: string | null }): string {
  const base = e.errorDescription || e.error;
  switch (e.error) {
    case "access_denied":
      return "Access denied — you cancelled the Spotify login.";
    case "invalid_request":
      return `Invalid request: ${base}`;
    case "invalid_client":
      return "Invalid client — check the Spotify app credentials.";
    case "invalid_grant":
      return "Invalid grant — the authorisation code expired. Try again.";
    case "unsupported_response_type":
      return "Unsupported response type.";
    case "server_error":
      return "Spotify server error — please try again later.";
    case "temporarily_unavailable":
      return "Spotify is temporarily unavailable — try again in a moment.";
    default:
      return `Spotify error: ${base}`;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Audio Analysis — used by the DRM-safe FFT simulation engine.
// Spotify Web Playback SDK does not expose raw PCM, so we drive the
// visualizers from the metadata + timed analysis arrays instead.
// ═══════════════════════════════════════════════════════════════════════

/** Subset of `GET /v1/audio-features/{id}` we actually use. */
export interface AudioFeatures {
  id: string;
  uri: string;
  name?: string;
  duration_ms: number;
  tempo: number;
  energy: number;
  loudness: number;
  danceability: number;
  valence: number;
  key: number;
  mode: number;
  time_signature: number;
}

/** Subset of `GET /v1/audio-analysis/{id}` we actually use. */
export interface AudioAnalysis {
  track: {
    duration_ms: number;
    tempo: number;
    time_signature: number;
    key: number;
    mode: number;
    loudness: number;
  };
  bars: Array<{ start: number; duration: number; confidence: number }>;
  beats: Array<{ start: number; duration: number; confidence: number }>;
  tatums: Array<{ start: number; duration: number; confidence: number }>;
  segments: Array<{
    start: number;
    duration: number;
    confidence: number;
    loudness_max: number;
    loudness_start: number;
    pitches: number[];
    timbre: number[];
  }>;
}

/**
 * Fetch `GET /v1/audio-features/{id}` for a single track.
 * Returns null on any failure (caller should fall back to defaults).
 */
export const fetchAudioFeatures = async (
  accessToken: string,
  trackId: string,
): Promise<AudioFeatures | null> => {
  try {
    const res = await fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const d = await res.json();
    if (!d || typeof d !== "object") return null;
    return {
      id: d.id ?? trackId,
      uri: d.uri ?? `spotify:track:${trackId}`,
      name: d.name,
      duration_ms: d.duration_ms ?? 0,
      tempo: d.tempo ?? 120,
      energy: clamp(d.energy, 0, 1, 0.5),
      loudness: clamp(d.loudness, -60, 0, -10),
      danceability: clamp(d.danceability, 0, 1, 0.5),
      valence: clamp(d.valence, 0, 1, 0.5),
      key: clampInt(d.key, 0, 11, 0),
      mode: clampInt(d.mode, 0, 1, 1),
      time_signature: clampInt(d.time_signature, 3, 7, 4),
    };
  } catch {
    return null;
  }
};

/**
 * Fetch `GET /v1/audio-analysis/{id}` for a single track.
 * Returns null on any failure (caller should fall back to defaults).
 */
export const fetchAudioAnalysis = async (
  accessToken: string,
  trackId: string,
): Promise<AudioAnalysis | null> => {
  try {
    const res = await fetch(`https://api.spotify.com/v1/audio-analysis/${trackId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const d = await res.json();
    if (!d || typeof d !== "object") return null;
    const raw = d as Record<string, unknown>;
    const track = (
      raw.track && typeof raw.track === "object" ? (raw.track as Record<string, unknown>) : {}
    ) as Record<string, unknown>;
    return {
      track: {
        duration_ms: Number(track.duration_ms) || 0,
        tempo: Number(track.tempo) || 120,
        time_signature: Number(track.time_signature) || 4,
        key: clampInt(track.key, 0, 11, 0),
        mode: clampInt(track.mode, 0, 1, 1),
        loudness: clamp(track.loudness, -60, 0, -10),
      },
      bars: sanitizeTimeline(raw.bars),
      beats: sanitizeTimeline(raw.beats),
      tatums: sanitizeTimeline(raw.tatums),
      segments: Array.isArray(raw.segments)
        ? raw.segments.map((s) => {
            const o = s as Record<string, unknown> | null | undefined;
            return {
              start: Number(o?.start) || 0,
              duration: Number(o?.duration) || 0,
              confidence: Number(o?.confidence) || 0,
              loudness_max: Number(o?.loudness_max) || 0,
              loudness_start: Number(o?.loudness_start) || 0,
              pitches: Array.isArray(o?.pitches)
                ? (o.pitches as unknown[]).map((n: unknown) => Number(n))
                : [0, 0, 0, 0, 0, 0, 0],
              timbre: Array.isArray(o?.timbre)
                ? (o.timbre as unknown[]).map((n: unknown) => Number(n))
                : [0, 0, 0, 0, 0, 0, 0],
            };
          })
        : [],
    };
  } catch {
    return null;
  }
};

function clamp(v: unknown, lo: number, hi: number, fb: number): number {
  const n = typeof v === "number" ? v : fb;
  return Math.max(lo, Math.min(hi, n));
}

function clampInt(v: unknown, lo: number, hi: number, fb: number): number {
  const n = typeof v === "number" ? v : fb;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function sanitizeTimeline(
  arr: unknown,
): Array<{ start: number; duration: number; confidence: number }> {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((s) => {
      const o = s as Record<string, unknown> | null | undefined;
      return {
        start: Number(o?.start) || 0,
        duration: Number(o?.duration) || 0,
        confidence: Number(o?.confidence) || 0,
      };
    })
    .filter((s) => Number.isFinite(s.start));
}
