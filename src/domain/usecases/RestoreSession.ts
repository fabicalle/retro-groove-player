/**
 * RestoreSession — reload a persisted Spotify session (encrypted storage).
 *
 * Returns a discriminated union so the caller can distinguish "no session
 * exists" (fresh launch → boot screen) from "session exists" (→ player)
 * from "session was corrupted" (→ boot screen with an error).
 */

import type { ISpotifyRepository, SpotifyAuthResult } from "../repositories/ISpotifyRepository";

export type RestoreSessionOutcome =
  | { ok: true; session: SpotifyAuthResult }
  | { ok: false; reason: "none" | "expired" | "corrupt"; error: string | null };

export class RestoreSession {
  constructor(private readonly spotify: ISpotifyRepository) {}

  async execute(): Promise<RestoreSessionOutcome> {
    const session = await this.spotify.restore();
    if (session) return { ok: true, session };
    return { ok: false, reason: "none", error: null };
  }
}
