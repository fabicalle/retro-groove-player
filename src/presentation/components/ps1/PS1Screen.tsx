import { useEffect, useState } from "react";
import { PS1Container } from "./PS1Container";

/**
 * Full-viewport PS1 BIOS Audio CD Player view.
 * Renders the native 640x480 PS1Container scaled to fit a 4:3 CRT frame.
 */
export function PS1Screen({ onExit }: { onExit: () => void }) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const recompute = () => {
      // Outer frame target: min(95vw, 1100px) wide, 4:3 ratio, capped at 92vh
      const maxW = Math.min(window.innerWidth * 0.95, 1100);
      const maxH = window.innerHeight * 0.92;
      const innerW = Math.min(maxW, (maxH / 3) * 4) - 36; // minus frame padding
      setScale(innerW / 640);
    };
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden">
      <div
        className="relative"
        style={{
          width: 640 * scale + 36,
          height: 480 * scale + 36,
          borderRadius: 24,
          padding: 18,
          background: "linear-gradient(145deg,#2a2a2a 0%,#0a0a0a 60%,#1a1a1a 100%)",
          boxShadow: "0 0 80px rgba(80,140,255,0.25), inset 0 0 30px rgba(0,0,0,0.9)",
        }}
      >
        {/* Inner CRT screen */}
        <div
          className="relative overflow-hidden"
          style={{
            width: 640 * scale,
            height: 480 * scale,
            borderRadius: 10,
            boxShadow: "inset 0 0 60px rgba(0,0,0,0.85)",
          }}
        >
          <div
            style={{
              width: 640,
              height: 480,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <PS1Container />
          </div>

          {/* CRT scanlines */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 1px, transparent 1px, transparent 3px)",
            }}
          />
          {/* CRT glare */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 30% 10%, rgba(255,255,255,0.07) 0%, transparent 45%)",
            }}
          />
        </div>

        {/* Power LEDs + exit */}
        <div className="absolute bottom-3 left-6 flex gap-4 items-center text-[10px] text-white/60 tracking-widest">
          <div className="flex items-center gap-1">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: "#3aff6b", boxShadow: "0 0 6px #3aff6b" }}
            />
            POWER
          </div>
          <div className="flex items-center gap-1">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: "#ff3838", boxShadow: "0 0 6px #ff3838" }}
            />
            CD
          </div>
        </div>

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
