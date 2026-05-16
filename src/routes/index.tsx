import { createFileRoute } from "@tanstack/react-router";
import { WinampPlayer } from "@/components/WinampPlayer";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
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
        <WinampPlayer />
        <p className="text-[10px] uppercase tracking-widest text-white/40">
          © 2003 — Made with floppy disks
        </p>
      </div>
    </main>
  );
}
