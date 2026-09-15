import { useEffect } from "react";
import { useSpotifyStore } from "../store/useSpotifyStore";
import { redirectToSpotify, getTokenFromCode } from "../lib/spotify";

// Module-level flag — survives component remounts caused by TanStack Router
let _authInitialized = false;

export function SpotifyConnect() {
  const { isAuthenticated, isRestoring, setAuth, logout, restoreSession } = useSpotifyStore();

  useEffect(() => {
    if (_authInitialized) return;
    _authInitialized = true;

    (async () => {
      // 1. Handle OAuth callback: ?code=... in URL
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) {
        // Exchange code FIRST, clean URL AFTER — avoids TanStack Router
        // remounting the component before the exchange completes
        const tokens = await getTokenFromCode(code);
        // Clean the URL only after token exchange
        window.history.replaceState({}, "", window.location.pathname);
        if (tokens) {
          setAuth(tokens);
          return;
        }
      }
      // 2. Try to restore from encrypted storage
      await restoreSession();
    })();
  }, [setAuth, restoreSession]);

  const handleAuth = async () => {
    if (isAuthenticated) {
      logout();
      return;
    }
    try {
      await redirectToSpotify();
    } catch (e) {
      console.error("Spotify redirect failed:", e);
    }
  };

  const statusText = isRestoring
    ? "CONNECTING…"
    : isAuthenticated
      ? "● LINKED · CONNECTED"
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
      </div>
      <button
        onClick={handleAuth}
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
