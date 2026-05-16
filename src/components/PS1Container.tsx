import { useEffect, useState } from "react";

/**
 * Emulates the classic PlayStation 1 (fat) Audio CD Player screen.
 * Black background, "PlayStation" wordmark, track list, and PS-style controls.
 */
export function PS1Container() {
  const [time, setTime] = useState(0);
  const [current, setCurrent] = useState(0);

  const tracks = [
    { n: 1, len: "4:17" },
    { n: 2, len: "3:42" },
    { n: 3, len: "5:08" },
    { n: 4, len: "3:29" },
    { n: 5, len: "4:55" },
    { n: 6, len: "3:11" },
    { n: 7, len: "6:02" },
  ];

  useEffect(() => {
    const id = setInterval(() => setTime((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div
      className="relative w-full h-full overflow-hidden font-pixel"
      style={{
        background: "#000",
        fontFamily: "var(--font-pixel)",
      }}
    >
      {/* faint CRT vignette + scanlines */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.7) 100%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 2px)",
        }}
      />

      <div className="relative z-0 flex h-full">
        {/* LEFT: PS logo + status */}
        <div className="w-[42%] border-r border-[#1a1f4a] p-1 flex flex-col justify-between">
          <div>
            <div
              className="text-[10px] leading-none tracking-wider"
              style={{ color: "#ff2d2d", fontFamily: "var(--font-display)" }}
            >
              PS
            </div>
            <div
              className="text-[8px] leading-tight"
              style={{ color: "#3aa0ff" }}
            >
              PlayStation
            </div>
            <div
              className="text-[6px] mt-0.5 leading-tight"
              style={{ color: "#888" }}
            >
              Sony Computer
              <br />
              Entertainment
            </div>
          </div>

          {/* spinning disc */}
          <div className="flex items-center justify-center my-0.5">
            <div
              className="w-7 h-7 rounded-full relative"
              style={{
                background:
                  "conic-gradient(from 0deg, #2a2a2a, #888, #2a2a2a, #aaa, #2a2a2a)",
                animation: "psspin 2s linear infinite",
                boxShadow: "0 0 4px rgba(58,160,255,0.5)",
              }}
            >
              <div className="absolute inset-[35%] rounded-full bg-black" />
            </div>
            <style>{`@keyframes psspin{to{transform:rotate(360deg)}}`}</style>
          </div>

          <div className="text-[7px] leading-tight" style={{ color: "#fff" }}>
            <div style={{ color: "#3aa0ff" }}>▶ PLAY</div>
            <div className="tabular-nums">{fmt(time)}</div>
          </div>
        </div>

        {/* RIGHT: track list grid */}
        <div className="flex-1 p-1">
          <div
            className="text-[7px] mb-0.5 tracking-widest"
            style={{ color: "#3aa0ff" }}
          >
            AUDIO CD
          </div>
          <div className="grid grid-cols-2 gap-x-1 gap-y-[1px]">
            {tracks.map((t, i) => (
              <button
                key={t.n}
                onClick={() => setCurrent(i)}
                className="flex justify-between text-[8px] leading-tight px-1"
                style={{
                  color: current === i ? "#000" : "#fff",
                  background: current === i ? "#3aa0ff" : "transparent",
                }}
              >
                <span className="tabular-nums">
                  {String(t.n).padStart(2, "0")}
                </span>
                <span className="tabular-nums opacity-80">{t.len}</span>
              </button>
            ))}
          </div>

          {/* PS face-button icons */}
          <div className="absolute bottom-1 right-1 flex gap-1 text-[8px] font-bold">
            <span style={{ color: "#3aa0ff" }}>✕</span>
            <span style={{ color: "#ff4d8a" }}>◯</span>
            <span style={{ color: "#a96bff" }}>△</span>
            <span style={{ color: "#3aff8a" }}>▢</span>
          </div>
        </div>
      </div>
    </div>
  );
}
