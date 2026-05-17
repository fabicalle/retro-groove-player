import { PS1Container } from "./PS1Container";

/**
 * Full-viewport PS1 BIOS Audio CD Player.
 * Wraps the small PS1Container at much larger scale and adds a hidden
 * "back to Winamp" exit button styled as a memory-card slot label.
 */
export function PS1Screen({ onExit }: { onExit: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden">
      {/* TV / CRT frame */}
      <div
        className="relative"
        style={{
          width: "min(95vw, 1100px)",
          aspectRatio: "4 / 3",
          maxHeight: "92vh",
          borderRadius: 24,
          padding: 18,
          background:
            "linear-gradient(145deg,#2a2a2a 0%,#0a0a0a 60%,#1a1a1a 100%)",
          boxShadow:
            "0 0 80px rgba(80,140,255,0.25), inset 0 0 30px rgba(0,0,0,0.9)",
        }}
      >
        {/* Inner screen with the BIOS UI rendered large */}
        <div
          className="relative w-full h-full overflow-hidden"
          style={{
            borderRadius: 12,
            boxShadow: "inset 0 0 60px rgba(0,0,0,0.9)",
          }}
        >
          {/* Scale the small 1x BIOS UI to fill the TV */}
          <div
            className="absolute"
            style={{
              top: 0,
              left: 0,
              width: 320,
              height: 240,
              transformOrigin: "top left",
              transform: "scale(var(--ps-scale, 3))",
            }}
          >
            <PS1Container />
          </div>

          {/* Responsive scale via container query fallback */}
          <ScaleSetter />

          {/* CRT global glare */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 30% 10%, rgba(255,255,255,0.08) 0%, transparent 40%)",
            }}
          />
        </div>

        {/* Power/Reset LEDs */}
        <div className="absolute bottom-3 left-6 flex gap-4 items-center text-[10px] text-white/60 tracking-widest">
          <div className="flex items-center gap-1">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{
                background: "#3aff6b",
                boxShadow: "0 0 6px #3aff6b",
              }}
            />
            POWER
          </div>
          <div className="flex items-center gap-1">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{
                background: "#ff3838",
                boxShadow: "0 0 6px #ff3838",
              }}
            />
            CD
          </div>
        </div>

        {/* Exit back to Winamp — styled like an OPEN button */}
        <button
          onClick={onExit}
          className="absolute bottom-3 right-6 px-3 py-1 text-[10px] tracking-widest text-white/80 border border-white/20 hover:bg-white/10"
          style={{ fontFamily: "var(--font-display)" }}
        >
          ◀ OPEN — WINAMP
        </button>
      </div>
    </div>
  );
}

/** Sets a CSS var so the inner 320x240 BIOS scales to fill the TV inner area. */
function ScaleSetter() {
  return (
    <style>{`
      @media (min-width: 0px) {
        :root { --ps-scale: 2.5; }
      }
      @media (min-width: 700px) {
        :root { --ps-scale: 3; }
      }
      @media (min-width: 1000px) {
        :root { --ps-scale: 3.4; }
      }
    `}</style>
  );
}
