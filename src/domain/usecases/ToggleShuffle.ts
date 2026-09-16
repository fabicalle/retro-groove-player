/**
 * ToggleShuffle — flip the player's shuffle state via the Web API.
 *
 * Domain logic: the new desired state is derived from the current state
 * passed in by the caller (presentation layer), not read from the
 * repository here. This keeps the use case deterministic and testable.
 */

import type { ISpotifyRepository } from "../repositories/ISpotifyRepository";

export interface ToggleShuffleRequest {
  currentlyShuffling: boolean;
}

export type ToggleShuffleOutcome = { ok: true; next: boolean } | { ok: false; error: string };

export class ToggleShuffle {
  constructor(private readonly spotify: ISpotifyRepository) {}

  async execute(request: ToggleShuffleRequest): Promise<ToggleShuffleOutcome> {
    const next = !request.currentlyShuffling;
    try {
      await this.spotify.setShuffle(next);
      return { ok: true, next };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Failed to toggle shuffle" };
    }
  }
}
