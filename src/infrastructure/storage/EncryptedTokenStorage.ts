/**
 * EncryptedTokenStorage — AES-GCM encrypted localStorage adapter.
 *
 * Tokens are NEVER stored as plain JSON. When Web Crypto is unavailable
 * (non-secure context) it falls back to a reversible base64 obfuscation.
 */

import type { ITokenStorage } from "./ITokenStorage";
import type { SpotifyAuthResult } from "../domain/repositories/ISpotifyRepository";
import { saveTokens, loadTokens, clearTokens, type SecureTokenData } from "@/lib/secure-storage";

export class EncryptedTokenStorage implements ITokenStorage {
  async save(tokens: SpotifyAuthResult): Promise<void> {
    const data: SecureTokenData = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    };
    await saveTokens(data);
  }

  async load(): Promise<SpotifyAuthResult | null> {
    const data = await loadTokens();
    if (!data) return null;
    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
    };
  }

  clear(): void {
    clearTokens();
  }
}
