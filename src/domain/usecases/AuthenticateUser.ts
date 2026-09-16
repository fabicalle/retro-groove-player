/**
 * AuthenticateUser — exchange an OAuth2 authorisation code for a session.
 *
 * Pure domain logic: it does not touch the URL, storage, or React. The
 * repository handles the HTTP exchange and token persistence; this use
 * case just decides what the application state should become as a result.
 *
 * Returns a discriminated union so callers can branch on the outcome
 * without throwing exceptions for expected failures (PKCE mismatch, etc.).
 */

import type { ISpotifyRepository, SpotifyAuthResult } from "../repositories/ISpotifyRepository";

export type AuthenticateOutcome =
  | { ok: true; tokens: SpotifyAuthResult }
  | { ok: false; error: string };

export class AuthenticateUser {
  constructor(private readonly spotify: ISpotifyRepository) {}

  async execute(code: string): Promise<AuthenticateOutcome> {
    if (!code) return { ok: false, error: "No authorisation code provided." };

    const result = await this.spotify.exchangeCode(code);
    if (result.tokens) return { ok: true, tokens: result.tokens };
    return { ok: false, error: result.error ?? "Spotify login failed. Please try again." };
  }
}
