/**
 * Secure token storage.
 * Uses AES-GCM encryption via Web Crypto when available (secure contexts).
 * Falls back to base64 obfuscation when crypto.subtle is unavailable.
 * Tokens are never stored as plain JSON — casual localStorage inspection
 * reveals nothing useful in either mode.
 */

const STORAGE_KEY = "sp_session";
const CRYPTO_KEY_NAME = "sp_ck";

const hasSubtle =
  typeof window !== "undefined" && !!window.crypto?.subtle;

// ── Crypto-based path (secure contexts) ──

let _cachedKey: CryptoKey | null = null;

async function getCryptoKey(): Promise<CryptoKey> {
  if (_cachedKey) return _cachedKey;

  let rawB64 = sessionStorage.getItem(CRYPTO_KEY_NAME);
  let rawBytes: Uint8Array;

  if (rawB64) {
    rawBytes = Uint8Array.from(atob(rawB64), (c) => c.charCodeAt(0));
  } else {
    rawBytes = crypto.getRandomValues(new Uint8Array(32));
    rawB64 = btoa(String.fromCharCode(...rawBytes));
    sessionStorage.setItem(CRYPTO_KEY_NAME, rawB64);
  }

  _cachedKey = await window.crypto.subtle.importKey(
    "raw",
    rawBytes,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );

  return _cachedKey;
}

// ── Obfuscation fallback (non-secure contexts) ──

function obfuscate(data: string): string {
  return btoa(
    encodeURIComponent(data)
      .split("")
      .reverse()
      .join(""),
  );
}

function deobfuscate(data: string): string {
  return decodeURIComponent(
    atob(data)
      .split("")
      .reverse()
      .join(""),
  );
}

export interface SecureTokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix ms timestamp
}

export async function saveTokens(data: SecureTokenData): Promise<void> {
  try {
    if (hasSubtle) {
      const key = await getCryptoKey();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encoded = new TextEncoder().encode(JSON.stringify(data));
      const ciphertext = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        encoded,
      );
      const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
      combined.set(iv);
      combined.set(new Uint8Array(ciphertext), iv.length);
      localStorage.setItem(STORAGE_KEY, btoa(String.fromCharCode(...combined)));
    } else {
      localStorage.setItem(STORAGE_KEY, obfuscate(JSON.stringify(data)));
    }
  } catch {
    // Silently fail
  }
}

export async function loadTokens(): Promise<SecureTokenData | null> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    let parsed: unknown;

    if (hasSubtle) {
      const key = await getCryptoKey();
      const combined = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
      const iv = combined.slice(0, 12);
      const ciphertext = combined.slice(12);
      const decrypted = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        ciphertext,
      );
      parsed = JSON.parse(new TextDecoder().decode(decrypted));
    } else {
      parsed = JSON.parse(deobfuscate(stored));
    }

    const t = parsed as SecureTokenData;
    if (t.accessToken && t.refreshToken && t.expiresAt) {
      return t;
    }
    return null;
  } catch {
    clearTokens();
    return null;
  }
}

export function clearTokens(): void {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(CRYPTO_KEY_NAME);
  _cachedKey = null;
}
