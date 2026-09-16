import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { WinampPlayer } from "@/presentation/components/player/WinampPlayer";
import { PS1Screen } from "@/presentation/components/ps1/PS1Screen";
import { PS1BootSequence } from "@/presentation/components/intro/PS1BootSequence";
import { useSpotifyAuth } from "@/presentation/hooks/useSpotifyAuth";
import { useAuthStore } from "@/presentation/state/useAuthStore";
import { useSpotifyStore } from "@/store/useSpotifyStore";

export const Route = createFileRoute("/")({
  component: Index,
});

/**
 * App state machine — single source of truth.
 *
 *   BOOTING  → restoring session / exchanging OAuth code. Nothing rendered.
 *   READY    → the player is available. Renders Winamp/PS1.
 *
 * `useSpotifyAuth` owns ALL URL/session/token logic. The route feeds its
 * derived values into `useAuthStore.sync()` and renders based on the
 * store's `status` + `bootCompleted` — it never inspects the URL itself.
 *
 * The boot flag lives in sessionStorage: it survives SPA navigation and
 * the OAuth callback reload (same session) but clears on browser/tab
 * close, so the intro replays on every fresh launch.
 */
const BOOT_KEY = "y2k_booted";

function readBootFlag(): boolean {
  try {
    return sessionStorage.getItem(BOOT_KEY) === "1";
  } catch {
    return false;
  }
}
function writeBootFlag(v: boolean) {
  try {
    if (v) sessionStorage.setItem(BOOT_KEY, "1");
    else sessionStorage.removeItem(BOOT_KEY);
  } catch {
    // ignore
  }
}

type Mode = "winamp" | "ps1";

function Index() {
  const auth = useSpotifyAuth();
  const { status, bootCompleted, completeBoot } = useAuthStore();
  const { isPremium } = useSpotifyStore();
  const [mode, setMode] = useState<Mode>("winamp");
  const [bootFlag, setBootFlag] = useState<boolean>(readBootFlag());

  // Push the auth hook's derived values into the store on every render.
  useEffect(() => {
    useAuthStore.getState().sync({
      isRestoring: auth.isRestoring,
      isCallback: auth.isCallback,
      isAuthenticated: auth.isAuthenticated,
      isPremium,
      error: auth.error,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isRestoring, auth.isCallback, auth.isAuthenticated, auth.error, isPremium]);

  // While hydrating or restoring, render a plain dark screen so the browser
  // never paints the boot sequence from the SSR markup or flashes it twice.
  if (status === "BOOTING" && !bootCompleted && !auth.isAuthenticated) {
    return <div className="fixed inset-0 bg-black" aria-hidden="true" />;
  }

  // Fresh session, not authenticated → PS1 POWER button + BIOS intro.
  if (status === "BOOTING" && !bootCompleted && !bootFlag) {
    return (
      <PS1BootSequence
        onComplete={() => {
          writeBootFlag(true);
          setBootFlag(true);
          completeBoot();
        }}
      />
    );
  }

  if (mode === "ps1") {
    return <PS1Screen onExit={() => setMode("winamp")} />;
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-6">
        <h1
          className="text-[var(--winamp-lcd)] text-xs sm:text-sm tracking-[0.3em] uppercase"
          style={{
            fontFamily: "var(--font-display)",
            textShadow: "0 0 10px var(--winamp-lcd)",
          }}
        >
          ✦ Y2K Player ✦
        </h1>
        <WinampPlayer onSwitchToPS1={() => setMode("ps1")} />
        <p className="text-[10px] uppercase tracking-widest text-white/40">
          © 2003 — Made with floppy disks
        </p>
      </div>
    </main>
  );
}
