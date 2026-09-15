import { useEffect, useState } from "react";
import { playPS1Chime } from "@/lib/ps1-chime";

/**
 * Faithful recreation of the original Sony PlayStation 1 (SCPH-1001) boot sequence:
 *  Stage 1 (0 – 2.5s):  black screen, then a soft diamond logo appears with
 *                       "Sony Computer Entertainment" in white serif text.
 *  Stage 2 (2.5 – 8s):  black, then the iconic "PS" diamond materializes with
 *                       the "PlayStation" wordmark below as the chime swells.
 *  Stage 3 (>8s):       calls onDone() to hand off to the main app.
 *
 * The audio API needs a user gesture before it can play, so the boot sequence
 * is gated behind a "POWER" button on first paint.
 */
export function PS1Boot({ onDone }: { onDone: () => void }) {
  const [stage, setStage] = useState<"power" | "sony" | "ps" | "done">("power");

  useEffect(() => {
    if (stage !== "sony") return;
    const t1 = setTimeout(() => setStage("ps"), 3200);
    return () => clearTimeout(t1);
  }, [stage]);

  useEffect(() => {
    if (stage !== "ps") return;
    const t = setTimeout(() => {
      setStage("done");
      onDone();
    }, 5200);
    return () => clearTimeout(t);
  }, [stage, onDone]);

  const start = async () => {
    setStage("sony");
    // Fire and forget — the chime is timed to the Sony fade + PS reveal.
    void playPS1Chime();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden flex items-center justify-center">
      {/* CRT scanlines + vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-30"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.35) 0px, rgba(0,0,0,0.35) 1px, transparent 1px, transparent 3px)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none z-30"
        style={{
          background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.8) 100%)",
        }}
      />

      {stage === "power" && (
        <button
          onClick={start}
          className="relative z-40 px-6 py-3 text-white border border-white/40 hover:bg-white/10 transition tracking-[0.4em] text-xs"
          style={{ fontFamily: "var(--font-display)" }}
        >
          ▶ POWER ON
        </button>
      )}

      {stage === "sony" && <SonyScreen />}
      {stage === "ps" && <PSScreen />}
    </div>
  );
}

function SonyScreen() {
  return (
    <div
      className="relative z-10 flex flex-col items-center gap-6 text-white animate-[sonyFade_3.2s_ease-in-out_forwards] opacity-0"
      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
    >
      {/* Small diamond logo */}
      <div className="relative w-16 h-16">
        <div
          className="absolute inset-0 rotate-45"
          style={{
            background: "linear-gradient(135deg, #f0f0f0 0%, #888 50%, #f0f0f0 100%)",
            boxShadow: "0 0 20px rgba(255,255,255,0.5)",
          }}
        />
        <div className="absolute inset-2 rotate-45" style={{ background: "#000" }} />
      </div>
      <div className="text-center">
        <div className="text-2xl tracking-[0.3em]">SONY</div>
        <div className="text-[10px] tracking-[0.4em] mt-2 opacity-90">COMPUTER ENTERTAINMENT</div>
      </div>
      <div className="text-[8px] tracking-widest opacity-50 mt-8">
        Licensed by Sony Computer Entertainment Inc.
      </div>
      <style>{`
        @keyframes sonyFade {
          0% { opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function PSScreen() {
  return (
    <div className="relative z-10 w-full h-full flex flex-col items-center justify-center animate-[psFade_5s_ease-in-out_forwards] opacity-0">
      {/* "PS" diamond logo */}
      <div className="relative" style={{ width: 220, height: 220 }}>
        {/* Diamond cube */}
        <div
          className="absolute inset-0"
          style={{
            transform: "rotate(45deg)",
            background: "linear-gradient(135deg, #ff2a2a 0%, #ff7a2a 50%, #ffcf2a 100%)",
            boxShadow: "0 0 60px rgba(255,80,40,0.7), inset 0 0 30px rgba(0,0,0,0.4)",
            animation: "psSpin 3s ease-out forwards",
          }}
        />
        {/* Letters PS */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            fontFamily: "Georgia, serif",
            fontWeight: 700,
            fontSize: 86,
            color: "#fff",
            textShadow: "2px 2px 4px rgba(0,0,0,0.6)",
            letterSpacing: -4,
          }}
        >
          PS
        </div>
      </div>

      {/* PlayStation wordmark */}
      <div
        className="mt-6 text-white text-4xl italic tracking-wider"
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontWeight: 400,
          textShadow: "0 0 10px rgba(120,160,255,0.8)",
        }}
      >
        Play<span style={{ color: "#6aaaff" }}>S</span>
        <span style={{ color: "#ffcc00" }}>t</span>
        <span style={{ color: "#3aff6b" }}>a</span>
        <span style={{ color: "#ff3838" }}>t</span>ion
      </div>

      <style>{`
        @keyframes psFade {
          0% { opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes psSpin {
          0% { transform: rotate(45deg) scale(0.3); opacity: 0; }
          60% { transform: rotate(405deg) scale(1.1); opacity: 1; }
          100% { transform: rotate(405deg) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
