import { useEffect } from "react";
import { useSpotifyStore } from "@/store/useSpotifyStore";
import { useSpotifyAuth } from "@/presentation/hooks/useSpotifyAuth";

/**
 * Spotify Connect button + status pill.
 *
 * Thin UI wrapper around `useSpotifyAuth`. All OAuth/URL/session logic lives
 * in the hook so the route's state machine can read a single source of
 * truth without inspecting the URL itself.
 */
export function SpotifyConnect() {
  const { isAuthenticated, isRestoring, error, connect, logout } = useSpotifyAuth();

  const statusText = isRestoring
    ? "CONNECTING…"
    : isAuthenticated
      ? "● LINKED · PREMIUM"
      : "SPOTIFY :: OFFLINE";

  return (
    <div className="bevel-out p-2 flex items-center gap-2">
      <div className="bevel-in px-2 py-1 flex-1">
        <span className="lcd-text text-sm">
          {isRestoring ? (
            <>
              CONNECTING<span className="blink">_</span>
            </>
          ) : (
            statusText
          )}
        </span>
        {error && (
          <div className="mt-1 text-[10px] truncate" style={{ color: "#ff9a8a" }} title={error}>
            ⚠ {error}
          </div>
        )}
      </div>
      <button
        onClick={isAuthenticated ? logout : connect}
        disabled={isRestoring}
        className="bevel-btn px-3 py-1 text-xs font-bold text-black hover:brightness-110 disabled:opacity-50"
        style={{
          background: isAuthenticated ? "var(--spotify)" : "var(--winamp-chrome)",
        }}
      >
        {isAuthenticated ? "DISCONNECT" : "CONNECT"}
      </button>
    </div>
  );
}

/**
 * Premium banner — rendered by the parent (WinampPlayer / PS1Visualizer)
 * when the account is on the free tier. Spotify Web Playback SDK requires a
 * Premium account to actually stream audio.
 */
export function SpotifyPremiumBanner() {
  const { error, isPremium, isAuthenticated, setPremium } = useSpotifyStore();

  // Auto-clear stale errors after 8 seconds
  useEffect(() => {
    if (!error) return undefined;
    const id = setTimeout(() => setPremium(isPremium, null), 8000);
    return () => clearTimeout(id);
  }, [error, isPremium, setPremium]);

  if (!isAuthenticated || !error) return null;

  return (
    <div
      className="bevel-in mt-2 px-2 py-2 text-xs lcd-text"
      style={{
        background: "rgba(255,59,38,0.12)",
        border: "1px solid #ff3b24",
        color: "#ff9a8a",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span>
          <b>⚠ {error}</b>
          <span className="opacity-80">
            {" "}
            Spotify Web Playback requires a <b>Premium</b> account. Free-tier accounts cannot stream
            to the web player.
          </span>
        </span>
        <button
          onClick={() => setPremium(isPremium, null)}
          className="text-[10px] opacity-70 hover:opacity-100"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
