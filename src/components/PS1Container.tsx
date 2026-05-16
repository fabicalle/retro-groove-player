import { useEffect, useState } from "react";

/**
 * Faithful recreation of the PlayStation 1 (SCPH-1001) BIOS Audio CD Player screen.
 * Reference: real PS1 BIOS "CD PLAYER" UI.
 */
export function PS1Container() {
  const [time, setTime] = useState({ track: 1, min: 0, sec: 3 });
  const [selected, setSelected] = useState(1);

  useEffect(() => {
    const id = setInterval(() => {
      setTime((t) => {
        const sec = (t.sec + 1) % 60;
        return { ...t, sec, min: sec === 0 ? t.min + 1 : t.min };
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Track palette mirrors the BIOS color cycling (purple, yellow, green, red).
  const trackColor = (n: number) => {
    const palette = ["#a26bff", "#ffd400", "#ffd400", "#ffd400", "#3aff6b"];
    const row = Math.floor((n - 1) / 5);
    const col = (n - 1) % 5;
    if (row === 0) return palette[col];
    if (row === 1) return ["#ff8a00", "#ffd400", "#ffd400", "#3aff6b", "#3aff6b"][col];
    if (row === 2) return ["#ff3838", "#ff3838", "#3aff6b", "#3aff6b", "#a26bff"][col];
    return "#ff3838";
  };

  const tracks = Array.from({ length: 16 }, (_, i) => i + 1);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, #4a3aa8 0%, #1a1764 55%, #08043a 100%)",
        fontFamily: "var(--font-pixel)",
      }}
    >
      {/* CRT scanlines */}
      <div
        className="absolute inset-0 pointer-events-none z-20"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 1px, transparent 1px, transparent 3px)",
        }}
      />
      {/* CRT vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-20"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      <div className="relative z-10 flex h-full p-1 gap-1 text-white">
        {/* LEFT: transport buttons stack (circular, PS-style coloured) */}
        <div className="flex flex-col justify-between py-0.5">
          {[
            { c: "#3aff6b", g: "linear-gradient(145deg,#7dffa3,#1ca83f)", l: "▶▶" },
            { c: "#3aff6b", g: "linear-gradient(145deg,#7dffa3,#1ca83f)", l: "▶" },
            { c: "#ff8aff", g: "linear-gradient(145deg,#ffc6ff,#a23ab8)", l: "❚❚" },
            { c: "#ff3838", g: "linear-gradient(145deg,#ff8a8a,#a40000)", l: "●" },
            { c: "#3aa0ff", g: "linear-gradient(145deg,#9ed3ff,#1a4ea8)", l: "◀" },
            { c: "#3aa0ff", g: "linear-gradient(145deg,#9ed3ff,#1a4ea8)", l: "◀◀" },
          ].map((b, i) => (
            <button
              key={i}
              className="rounded-full text-black text-[6px] font-bold flex items-center justify-center"
              style={{
                width: 14,
                height: 14,
                background: b.g,
                boxShadow: `0 0 3px ${b.c}, inset -1px -1px 2px rgba(0,0,0,0.4), inset 1px 1px 2px rgba(255,255,255,0.6)`,
              }}
            >
              {b.l}
            </button>
          ))}
        </div>

        {/* CENTER + RIGHT panel */}
        <div className="flex-1 flex flex-col gap-1">
          {/* Top row: time display + CD PLAYER label */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-1">
              {/* Track # */}
              <TimeBubble value={pad(time.track)} />
              {/* Minutes */}
              <div className="flex flex-col items-center">
                <TimeBubble value={pad(time.min)} />
                <span className="text-[6px] tracking-widest opacity-90">MIN</span>
              </div>
              {/* dot separator */}
              <div className="w-0.5 h-0.5 rounded-full bg-[#ffd400] mt-2" />
              {/* Seconds */}
              <div className="flex flex-col items-center">
                <TimeBubble value={pad(time.sec)} />
                <span className="text-[6px] tracking-widest opacity-90">SEC</span>
              </div>
            </div>

            <div
              className="px-1.5 py-0.5 text-[8px] font-bold tracking-wider"
              style={{
                background: "#0a0050",
                border: "1px solid #6a9bff",
                color: "#ffffff",
                fontFamily: "var(--font-display)",
                fontSize: 6,
              }}
            >
              CD PLAYER
            </div>
          </div>

          {/* Middle: info panel + track grid */}
          <div className="flex-1 flex gap-1 min-h-0">
            {/* Info panel with pink triangle cursor + CONTINUE */}
            <div
              className="flex-1 relative px-1 py-0.5"
              style={{
                background: "rgba(10,5,80,0.55)",
                border: "1px solid #6a9bff",
              }}
            >
              {/* pink triangle cursor */}
              <div
                className="absolute"
                style={{
                  top: 2,
                  left: 2,
                  width: 0,
                  height: 0,
                  borderLeft: "5px solid #ff3aa8",
                  borderTop: "3px solid transparent",
                  borderBottom: "3px solid transparent",
                  filter: "drop-shadow(0 0 1px #fff)",
                }}
              />
              <div className="absolute bottom-0.5 left-1 text-[7px] tracking-wider">
                CONTINUE
              </div>
            </div>

            {/* Track grid 5 cols */}
            <div className="grid grid-cols-5 gap-[3px] content-start">
              {tracks.map((n) => (
                <button
                  key={n}
                  onClick={() => setSelected(n)}
                  className="rounded-full flex items-center justify-center font-bold text-black"
                  style={{
                    width: 12,
                    height: 12,
                    fontSize: 6,
                    background: `radial-gradient(circle at 35% 30%, #fff 0%, ${trackColor(n)} 50%, #000 130%)`,
                    boxShadow:
                      selected === n
                        ? `0 0 4px #fff, inset 0 0 2px rgba(0,0,0,0.5)`
                        : `inset -1px -1px 2px rgba(0,0,0,0.5), inset 1px 1px 1px rgba(255,255,255,0.6)`,
                    outline: selected === n ? "1px solid #ff3aa8" : "none",
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom: menu strip */}
          <div className="flex items-end justify-between gap-1 text-[7px] tracking-wide">
            <div className="flex flex-col gap-0.5">
              <div className="flex gap-1.5">
                <MenuLabel>CONTINUE</MenuLabel>
                <MenuLabel>SHUFFLE</MenuLabel>
                <MenuLabel>PROGRAM</MenuLabel>
              </div>
              <div className="flex gap-1.5">
                <MenuLabel>REPEAT</MenuLabel>
                <MenuLabel>TIME</MenuLabel>
              </div>
            </div>

            {/* EXIT button with rainbow glitch */}
            <div
              className="px-1.5 py-0.5 font-bold text-white"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 7,
                background:
                  "linear-gradient(90deg,#ff3838,#ffd400,#3aff6b,#3aa0ff,#a26bff)",
                textShadow: "1px 0 0 #000, -1px 0 0 #000",
                filter: "saturate(1.3)",
              }}
            >
              EXIT
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimeBubble({ value }: { value: string }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold"
      style={{
        width: 18,
        height: 18,
        background:
          "radial-gradient(circle at 35% 30%, #6a9bff 0%, #1a4ea8 60%, #0a1f6a 100%)",
        color: "#bfe0ff",
        fontSize: 9,
        textShadow: "0 0 3px #6af",
        boxShadow:
          "inset -1px -1px 2px rgba(0,0,0,0.6), inset 1px 1px 2px rgba(255,255,255,0.4)",
      }}
    >
      {value}
    </div>
  );
}

function MenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-white/90"
      style={{ textShadow: "1px 1px 0 rgba(0,0,0,0.7)" }}
    >
      {children}
    </span>
  );
}
