/**
 * ITokenStorage — contract for persisting Spotify auth tokens.
 *
 * The domain use cases need to read/write tokens without caring whether
 * the storage is encrypted localStorage, sessionStorage, or a keychain.
 */

import type { SpotifyAuthResult } from "../domain/repositories/ISpotifyRepository";

export interface ITokenStorage {
  save(tokens: SpotifyAuthResult): Promise<void> | void;
  load(): Promise<SpotifyAuthResult | null> | SpotifyAuthResult | null;
  clear(): void;
}
