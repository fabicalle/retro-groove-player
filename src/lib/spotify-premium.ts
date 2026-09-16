/**
 * Spotify Premium detection.
 *
 * The Web Playback SDK requires a Premium account to actually stream audio.
 * Free-tier accounts get 403 on every playback API call. We detect this
 * early via `GET /v1/me/player` (which returns `device.is_restricted: true`
 * for free-tier accounts) and surface a banner instead of a silent 403.
 */

export interface PremiumCheckResult {
  isPremium: boolean;
  error: string | null;
}

interface PlaybackDevice {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  is_restricted: boolean;
}

interface PlayerResponse {
  devices?: PlaybackDevice[];
}

/**
 * Check whether the authenticated Spotify account is Premium.
 *
 * - Returns `isPremium: true` on success.
 * - Returns `isPremium: false` + error when the account is free-tier
 *   (device restricted) or the request fails for another reason.
 */
export async function checkPremium(accessToken: string): Promise<PremiumCheckResult> {
  try {
    const res = await fetch("https://api.spotify.com/v1/me/player", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status === 401) {
      return { isPremium: false, error: "Token expired" };
    }

    // 403 = free tier or insufficient scopes
    if (res.status === 403) {
      const body = await res.text();
      return {
        isPremium: false,
        error: body
          ? `Spotify rejected playback (free tier): ${body}`
          : "Free-tier account — Premium required",
      };
    }

    if (!res.ok) {
      return { isPremium: false, error: `Spotify API ${res.status}` };
    }

    const data = (await res.json()) as PlayerResponse;
    // A free-tier account returns a restricted device even when no player is active.
    const devices = data?.devices ?? [];
    const active = devices.find((d) => d?.is_active) ?? devices[0];
    if (active?.is_restricted === true) {
      return {
        isPremium: false,
        error: "Free-tier account — Spotify Web Playback requires Premium.",
      };
    }

    return { isPremium: true, error: null };
  } catch (err) {
    return {
      isPremium: false,
      error: err instanceof Error ? err.message : "Network error checking Premium status",
    };
  }
}
