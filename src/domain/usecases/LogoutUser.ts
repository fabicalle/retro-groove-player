/**
 * LogoutUser — clear the Spotify session.
 *
 * Pure domain logic: the repository owns token storage and the SDK
 * disconnect. This use case just coordinates the two so the presentation
 * layer has a single call to make.
 */

import type { ISpotifyRepository } from "../repositories/ISpotifyRepository";

export type LogoutOutcome = { ok: true } | { ok: false; error: string };

export class LogoutUser {
  constructor(private readonly spotify: ISpotifyRepository) {}

  async execute(): Promise<LogoutOutcome> {
    try {
      this.spotify.disconnect();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Logout failed" };
    }
  }
}
