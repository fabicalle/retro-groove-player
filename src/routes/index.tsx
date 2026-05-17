import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { WinampPlayer } from "@/components/WinampPlayer";
import { PS1Screen } from "@/components/PS1Screen";
import { PS1Boot } from "@/components/PS1Boot";

export const Route = createFileRoute("/")({
  component: Index,
});

type Mode = "winamp" | "ps1";

function Index() {
  const [booted, setBooted] = useState(false);
  const [mode, setMode] = useState<Mode>("winamp");

  if (!booted) return <PS1Boot onDone={() => setBooted(true)} />;

  if (mode === "ps1") return <PS1Screen onExit={() => setMode("winamp")} />;

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
