/**
 * DetectPremium — check whether the authenticated account can stream via
 * the Spotify Web Playback SDK.
 *
 * Free-tier accounts get a 403 on every playback API call; detecting this
 * early lets the UI surface a banner instead of a silent failure.
 */

import type { ISpotifyRepository } from "../repositories/ISpotifyRepository";
import type { PremiumStatus } from "../entities/Session";

export interface DetectPremiumRequest {
  accessToken: string;
}

export type DetectPremiumOutcome =
  | { ok: true; status: PremiumStatus; error: string | null }
  | { ok: false; error: string };

export class DetectPremium {
  constructor(private readonly spotify: ISpotifyRepository) {}

  async execute(request: DetectPremiumRequest): Promise<DetectPremiumOutcome> {
    const result = await this.spotify.checkPremium(request.accessToken);
    if (result.error && !result.isPremium) {
      return { ok: true, status: "free_tier", error: result.error };
    }
    if (result.isPremium) return { ok: true, status: "premium", error: null };
    return { ok: true, status: "free_tier", error: result.error };
  }
}
