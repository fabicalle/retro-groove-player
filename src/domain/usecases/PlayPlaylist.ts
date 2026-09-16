/**
 * PlayPlaylist — start playback of an entire playlist context.
 */

import type { ISpotifyRepository } from "../repositories/ISpotifyRepository";

export interface PlayPlaylistRequest {
  playlistId: string;
  deviceId?: string | null;
}

export type PlayPlaylistOutcome = { ok: true } | { ok: false; error: string };

export class PlayPlaylist {
  constructor(private readonly spotify: ISpotifyRepository) {}

  async execute(request: PlayPlaylistRequest): Promise<PlayPlaylistOutcome> {
    try {
      await this.spotify.play({
        deviceId: request.deviceId,
        contextUri: `spotify:playlist:${request.playlistId}`,
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Playback failed" };
    }
  }
}
