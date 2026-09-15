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

export const getTokenFromCode = async (code: string): Promise<TokenResponse | null> => {
  const verifier = sessionStorage.getItem("spotify_verifier");
  if (!verifier) return null;

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
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.access_token || !data.refresh_token) return null;

    const tokens: SecureTokenData = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    };

    // Persist encrypted
    await saveTokens(tokens);
    // Clean up verifier
    sessionStorage.removeItem("spotify_verifier");

    return tokens;
  } catch {
    return null;
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
