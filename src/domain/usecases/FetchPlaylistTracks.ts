/**
 * FetchPlaylistTracks — retrieve every track in a playlist (paginated).
 */

import type { ISpotifyRepository } from "../repositories/ISpotifyRepository";
import type { Playlist } from "../entities/Playlist";
import type { Track } from "../entities/Track";

export interface FetchPlaylistTracksRequest {
  playlist: Playlist;
}

export type FetchPlaylistTracksOutcome =
  | { ok: true; playlist: Playlist; tracks: Track[] }
  | { ok: false; error: string };

export class FetchPlaylistTracks {
  constructor(private readonly spotify: ISpotifyRepository) {}

  async execute(request: FetchPlaylistTracksRequest): Promise<FetchPlaylistTracksOutcome> {
    try {
      const tracks = await this.spotify.fetchPlaylistTracks(request.playlist.id);
      return { ok: true, playlist: request.playlist, tracks };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to load tracks",
      };
    }
  }
}
