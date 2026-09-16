/**
 * FetchPlaylists — retrieve the authenticated user's Spotify playlists.
 *
 * Domain logic only: the repository performs the HTTP call and maps the
 * response to domain `Playlist` entities. This use case is what the
 * presentation layer calls; it never touches `fetch` directly.
 */

import type { ISpotifyRepository } from "../repositories/ISpotifyRepository";
import type { Playlist } from "../entities/Playlist";

export type FetchPlaylistsOutcome =
  | { ok: true; playlists: Playlist[] }
  | { ok: false; error: string };

export class FetchPlaylists {
  constructor(private readonly spotify: ISpotifyRepository) {}

  async execute(): Promise<FetchPlaylistsOutcome> {
    try {
      const playlists = await this.spotify.fetchPlaylists();
      return { ok: true, playlists };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Failed to load playlists" };
    }
  }
}
