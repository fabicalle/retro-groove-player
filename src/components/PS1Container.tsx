import { useEffect, useState } from "react";
import { GeissVisualizer } from "./GeissVisualizer";

/**
 * Pixel-faithful recreation of the SCPH-1001 PlayStation BIOS "CD PLAYER" screen.
 * Reference: official BIOS screenshot (drew1440.com).
 *
 * Internal coordinate system: 640 x 480 (PS1 native), absolutely positioned.
 * The parent (PS1Screen) scales this via CSS transform to fill the TV frame.
 */
export function PS1Container() {
  const [time, setTime] = useState({ track: 0, min: 0, sec: 0 });
  const [selected, setSelected] = useState<number | null>(null);
  const [geiss, setGeiss] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setTime((t) => {
        const sec = (t.sec + 1) % 60;
        return { ...t, sec, min: sec === 0 ? t.min + 1 : t.min };
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const pad2 = (n: number) => String(n).padStart(2, "0");

  // Transport buttons (top → bottom), matching the BIOS exactly.
  const transport: Array<{ color: "green" | "blue" | "red" | "yellow"; glyph: string }> = [
    { color: "green", glyph: "▶▶" },
    { color: "green", glyph: "▶▶" },
    { color: "blue", glyph: "▶" },
    { color: "red", glyph: "■" },
    { color: "yellow", glyph: "❚❚" },
    { color: "yellow", glyph: "◀◀" },
    { color: "yellow", glyph: "◀◀" },
  ];

  // 5-col track dot grid (BIOS palette by row: yellow, yellow, red, purple, ...)
  const dotRows: string[][] = [
    ["#f5d800", "#f5d800", "#f5d800", "#f5d800", "#3aff6b"],
    ["#f5d800", "#f5d800", "#f5d800", "#f5d800", "#3aff6b"],
    ["#ff2a2a", "#ff2a2a", "#ff2a2a", "#ff2a2a", "#a26bff"],
    ["#a26bff", "#a26bff", "#a26bff", "#a26bff", "#a26bff"],
  ];

  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: 640,
        height: 480,
        background:
          "radial-gradient(ellipse at 50% 45%, #5a4ec8 0%, #2a2380 45%, #0d0848 85%, #050224 100%)",
        fontFamily: "Arial, Helvetica, sans-serif",
        color: "#fff",
      }}
    >
      {/* Subtle background bubbles (faint, like the BIOS) */}
      <Bubble x={500} y={420} r={60} opacity={0.35} />
      <Bubble x={70} y={440} r={45} opacity={0.25} />
      <Bubble x={580} y={350} r={28} opacity={0.55} />

      {/* === TRANSPORT BUTTONS (left column) === */}
      <div
        className="absolute"
        style={{ left: 18, top: 28, display: "flex", flexDirection: "column", gap: 6 }}
      >
        {transport.map((b, i) => (
          <TransportSphere key={i} color={b.color} glyph={b.glyph} />
        ))}
      </div>

      {/* === TIME DISPLAY (three top spheres) === */}
      {/* Small track-number sphere */}
      <TimeSphere x={130} y={45} size={48} value={String(time.track)} />
      {/* Big MIN sphere */}
      <TimeSphere x={205} y={55} size={72} value={pad2(time.min)} label="MIN" />
      {/* Tiny yellow colon dot */}
      <div
        className="absolute"
        style={{
          left: 295,
          top: 95,
          width: 10,
          height: 10,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 35% 30%, #fff7a0 0%, #f5d800 60%, #8a7000 100%)",
          boxShadow: "0 0 6px #f5d800",
        }}
      />
      {/* Big SEC sphere */}
      <TimeSphere x={320} y={55} size={72} value={pad2(time.sec)} label="SEC" />

      {/* === CD PLAYER label (top-right) === */}
      <div
        className="absolute flex items-center justify-center"
        style={{
          right: 28,
          top: 30,
          width: 200,
          height: 48,
          background: "#0a0428",
          border: "3px solid #6a7fe5",
          boxShadow: "inset 0 0 8px rgba(0,0,0,0.6)",
        }}
      >
        <span
          style={{
            fontFamily: "Arial Black, Arial, sans-serif",
            fontWeight: 900,
            fontSize: 24,
            letterSpacing: 2,
            color: "#fff",
            textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
          }}
        >
          CD PLAYER
        </span>
      </div>

      {/* === INFO PANEL (with pink triangle cursor + CONTINUE) === */}
      <div
        className="absolute"
        style={{
          left: 90,
          top: 150,
          width: 290,
          height: 165,
          background:
            "linear-gradient(180deg, rgba(80,70,180,0.35) 0%, rgba(40,30,120,0.45) 100%)",
          border: "2px solid #6a7fe5",
          boxShadow:
            "inset 0 0 20px rgba(20,10,80,0.6), inset 0 0 2px rgba(255,255,255,0.2)",
        }}
      >
        {/* Pink triangle cursor pointing right, on the left edge */}
        <div
          className="absolute"
          style={{
            left: -6,
            top: 12,
            width: 0,
            height: 0,
            borderLeft: "22px solid #ff3aa8",
            borderTop: "13px solid transparent",
            borderBottom: "13px solid transparent",
            filter:
              "drop-shadow(2px 2px 0 rgba(0,0,0,0.5)) drop-shadow(0 0 4px rgba(255,80,180,0.8))",
          }}
        />
        {/* CONTINUE label at bottom-left of the panel */}
        <div
          className="absolute"
          style={{
            left: 14,
            bottom: 14,
            fontFamily: "Arial Black, Arial, sans-serif",
            fontWeight: 900,
            fontSize: 18,
            color: "#fff",
            letterSpacing: 1,
            textShadow: "2px 2px 0 rgba(0,0,0,0.5)",
          }}
        >
          CONTINUE
        </div>
      </div>

      {/* === TRACK DOT GRID (right) === */}
      <div
        className="absolute"
        style={{
          left: 415,
          top: 155,
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 22,
          rowGap: 28,
        }}
      >
        {dotRows.flatMap((row, ri) =>
          row.map((c, ci) => {
            const idx = ri * 5 + ci + 1;
            const isSel = selected === idx;
            return (
              <button
                key={idx}
                onClick={() => setSelected(idx)}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: `radial-gradient(circle at 35% 30%, #fff 0%, ${c} 55%, rgba(0,0,0,0.4) 130%)`,
                  boxShadow: isSel
                    ? `0 0 8px ${c}, 0 0 14px #fff`
                    : `0 0 4px rgba(0,0,0,0.5)`,
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              />
            );
          }),
        )}
      </div>

      {/* === BOTTOM MENU STRIP === */}
      <div
        className="absolute"
        style={{
          left: 90,
          bottom: 60,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", gap: 18 }}>
          <MenuButton>CONTINUE</MenuButton>
          <MenuButton>SHUFFLE</MenuButton>
          <MenuButton>PROGRAM</MenuButton>
        </div>
        <div style={{ display: "flex", gap: 18 }}>
          <MenuButton>REPEAT</MenuButton>
          <MenuButton>TIME</MenuButton>
        </div>
      </div>

      {/* === EXIT button with rainbow glitch === */}
      <div
        className="absolute"
        style={{
          right: 55,
          bottom: 55,
          width: 230,
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* rainbow glitch scatter behind */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg,#ff3838 0%,#ff8a00 18%,#f5d800 35%,#3aff6b 55%,#3aa0ff 75%,#a26bff 100%)",
            filter: "blur(0.5px)",
            clipPath:
              "polygon(0% 30%, 5% 10%, 12% 40%, 18% 0%, 25% 50%, 32% 15%, 40% 60%, 48% 5%, 56% 55%, 64% 20%, 72% 70%, 80% 10%, 88% 50%, 96% 25%, 100% 60%, 100% 100%, 0% 100%)",
            opacity: 0.95,
          }}
        />
        <span
          className="relative"
          style={{
            fontFamily: "Arial Black, Arial, sans-serif",
            fontWeight: 900,
            fontSize: 42,
            color: "#fff",
            letterSpacing: 4,
            textShadow:
              "2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000",
          }}
        >
          EXIT
        </span>
      </div>
    </div>
  );
}

/* ============================================================== */
/* Sub-components                                                  */
/* ============================================================== */

function TransportSphere({
  color,
  glyph,
}: {
  color: "green" | "blue" | "red" | "yellow";
  glyph: string;
}) {
  const palette = {
    green: { hi: "#9bff9b", mid: "#1cc844", lo: "#085018" },
    blue: { hi: "#bcd3ff", mid: "#3866e8", lo: "#0a1c7a" },
    red: { hi: "#ffb0b0", mid: "#e83838", lo: "#6a0010" },
    yellow: { hi: "#fff39b", mid: "#e8b818", lo: "#5a4000" },
  }[color];

  return (
    <div
      style={{
        width: 50,
        height: 50,
        borderRadius: "50%",
        background: `radial-gradient(circle at 32% 28%, #fff 0%, ${palette.hi} 12%, ${palette.mid} 50%, ${palette.lo} 100%)`,
        boxShadow: `0 4px 6px rgba(0,0,0,0.5), inset -3px -4px 8px rgba(0,0,0,0.4)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#000",
        fontWeight: 900,
        fontSize: 14,
        textShadow: "1px 1px 0 rgba(255,255,255,0.4)",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      {glyph}
    </div>
  );
}

function TimeSphere({
  x,
  y,
  size,
  value,
  label,
}: {
  x: number;
  y: number;
  size: number;
  value: string;
  label?: string;
}) {
  return (
    <div className="absolute" style={{ left: x, top: y, width: size }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: `radial-gradient(circle at 32% 28%, #fff 0%, #bcd3ff 14%, #4a78e8 50%, #0a1c7a 100%)`,
          boxShadow: `0 4px 8px rgba(0,0,0,0.55), inset -4px -5px 12px rgba(0,0,0,0.5)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial Black, Arial, sans-serif",
          fontWeight: 900,
          fontSize: size * 0.45,
          color: "#fff",
          textShadow: "2px 2px 0 rgba(0,0,0,0.55)",
        }}
      >
        {value}
      </div>
      {label && (
        <div
          style={{
            textAlign: "center",
            marginTop: 4,
            fontFamily: "Arial Black, Arial, sans-serif",
            fontWeight: 900,
            fontSize: 14,
            color: "#fff",
            letterSpacing: 1,
            textShadow: "1px 1px 0 rgba(0,0,0,0.6)",
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

function Bubble({
  x,
  y,
  r,
  opacity,
}: {
  x: number;
  y: number;
  r: number;
  opacity: number;
}) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: "50%",
        background: `radial-gradient(circle at 32% 28%, #fff 0%, #bcd3ff 12%, #4a78e8 55%, #0a1c7a 100%)`,
        opacity,
      }}
    />
  );
}

function MenuButton({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "4px 14px",
        background:
          "linear-gradient(180deg, rgba(80,70,180,0.5) 0%, rgba(30,20,100,0.6) 100%)",
        border: "2px solid #6a7fe5",
        fontFamily: "Arial Black, Arial, sans-serif",
        fontWeight: 900,
        fontSize: 14,
        color: "#fff",
        letterSpacing: 1,
        textShadow: "1px 1px 0 rgba(0,0,0,0.5)",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      {children}
    </div>
  );
}
