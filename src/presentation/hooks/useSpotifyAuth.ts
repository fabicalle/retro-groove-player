import { useEffect, useState } from "react";
import { useSpotifyStore } from "@/store/useSpotifyStore";
import {
  getTokenFromCode,
  getAuthErrorFromUrl,
  isOnCallbackUrl,
  clearOAuthParams,
  describeAuthError,
  redirectToSpotify,
} from "@/lib/spotify";

export interface SpotifyAuthState {
  /** True while the persisted session is being restored / the OAuth
   *  callback is being exchanged. The caller should render nothing. */
  isRestoring: boolean;
  /** True once a valid Spotify session exists. */
  isAuthenticated: boolean;
  /** User-facing auth error (OAuth denied, token exchange failed, etc.). */
  error: string | null;
  /** True when the current URL holds an OAuth response (`?code=` / `?error=`). */
  isCallback: boolean;
  /** Trigger the Spotify OAuth redirect. */
  connect: () => Promise<void>;
  /** Clear the session. */
  logout: () => void;
}

/**
 * Centralised Spotify authentication hook.
 *
 * This is the ONLY place that touches the OAuth callback URL. It owns:
 *   - Detecting `?code=` / `?error=` in the URL.
 *   - Exchanging the authorisation code for tokens (PKCE).
 *   - Restoring a persisted session from encrypted storage.
 *   - Stripping OAuth params from the URL after processing.
 *
 * The route's state machine calls this hook and derives its render
 * state from the returned flags — it never inspects the URL itself.
 *
 * On mount it ALWAYS restores the persisted session (so a reload after
 * an OAuth callback lands on PLAYER instead of BOOT_SCREEN), and
 * additionally processes any OAuth response present in the URL.
 */
export function useSpotifyAuth(): SpotifyAuthState {
  const { isAuthenticated, isRestoring, error, setAuth, logout, restoreSession, setError } =
    useSpotifyStore();

  const [authError, setAuthError] = useState<string | null>(null);
  const [isCallback, setIsCallback] = useState<boolean>(() => isOnCallbackUrl());

  useEffect(() => {
    let cancelled = false;

    const processCallback = async () => {
      // 0. Handle OAuth error response (?error=access_denied, etc.)
      const oauthError = getAuthErrorFromUrl();
      if (oauthError) {
        clearOAuthParams();
        if (cancelled) return;
        const msg = describeAuthError(oauthError);
        setAuthError(msg);
        setError(msg);
        return;
      }

      // 1. Handle OAuth callback: ?code=...
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) {
        // Exchange code FIRST, clean URL AFTER — avoids the router
        // remounting before the exchange completes.
        const result = await getTokenFromCode(code);
        clearOAuthParams();
        if (cancelled) return;
        if (result.tokens) {
          setAuth(result.tokens);
          setAuthError(null);
          return;
        }
        // Exchange failed — surface the real Spotify error and fall
        // through to restoreSession below.
        setAuthError(result.error ?? "Spotify login failed. Please try again.");
      }

      // 2. Restore from encrypted storage (also the fallback path when
      //    the code exchange failed, and the normal path on a fresh load).
      await restoreSession();
    };

    // Always restore the persisted session on mount. This is what makes
    // the OAuth callback reload skip the intro: the encrypted token
    // survives the reload, so restoreSession resolves with
    // isAuthenticated=true and we land on PLAYER instead of BOOT_SCREEN.
    // If the URL holds an OAuth response, process that first.
    (async () => {
      if (isOnCallbackUrl()) {
        await processCallback();
      } else {
        await restoreSession();
      }
      if (!cancelled) setIsCallback(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = async () => {
    setAuthError(null);
    // Never start a redirect while the URL still holds an OAuth response —
    // that would restart the whole flow and loop.
    if (isOnCallbackUrl()) {
      clearOAuthParams();
      return;
    }
    try {
      await redirectToSpotify();
    } catch (e) {
      console.error("Spotify redirect failed:", e);
      const msg = "Spotify redirect failed. Please try again.";
      setAuthError(msg);
      setError(msg);
    }
  };

  return {
    isRestoring,
    isAuthenticated,
    error: authError ?? error,
    isCallback,
    connect,
    logout,
  };
}
