/**
 * PlayTrack — start playback of a single track (or within a playlist context).
 */

import type { ISpotifyRepository } from "../repositories/ISpotifyRepository";
import type { PlaybackCommand } from "../entities/Session";

export interface PlayTrackRequest {
  uri: string;
  contextUri?: string;
  deviceId?: string | null;
}

export type PlayTrackOutcome = { ok: true } | { ok: false; error: string };

export class PlayTrack {
  constructor(private readonly spotify: ISpotifyRepository) {}

  async execute(request: PlayTrackRequest): Promise<PlayTrackOutcome> {
    const command: PlaybackCommand = { deviceId: request.deviceId };
    if (request.contextUri) {
      command.contextUri = request.contextUri;
      command.offsetUri = request.uri;
    } else {
      command.uris = [request.uri];
    }
    try {
      await this.spotify.play(command);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Playback failed" };
    }
  }
}
