import { useEffect, useRef, useState } from "react";

/**
 * Geiss-style visualizer with controls:
 *  - Play/Pause animation
 *  - Style presets (Classic / Tunnel / Mirror / Plasma)
 *  - Sensitivity slider (amplitude multiplier)
 *  - Settings persisted in localStorage
 *  - Mouse wheel cycles styles, touch gestures for mobile
 * Exit via ESC or the EXIT button.
 */

type Style = "classic" | "tunnel" | "mirror" | "plasma";
const STYLES: Style[] = ["classic", "tunnel", "mirror", "plasma"];

const STORAGE_KEY = "geiss_settings";

interface GeissSettings {
  style: Style;
  sensitivity: number;
  playing: boolean;
}

function loadSettings(): GeissSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      return {
        style: STYLES.includes(s.style) ? s.style : "classic",
        sensitivity:
          typeof s.sensitivity === "number" ? Math.max(0.2, Math.min(2.5, s.sensitivity)) : 1,
        playing: typeof s.playing === "boolean" ? s.playing : true,
      };
    }
  } catch {
    /* ignore */
  }
  return { style: "classic", sensitivity: 1, playing: true };
}

function saveSettings(s: GeissSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function GeissVisualizer({
  onExit,
  variant = "winamp",
}: {
  onExit: () => void;
  variant?: "winamp" | "ps1";
}) {
  const saved = useRef(loadSettings());
  const ref = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(saved.current.playing);
  const [style, setStyle] = useState<Style>(saved.current.style);
  const [sensitivity, setSensitivity] = useState(saved.current.sensitivity);

  // Keep latest onExit in a ref so the rAF loop + key handler can call it
  // without depending on the parent's inline callback identity.
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  // refs so the rAF loop reads latest values without re-subscribing
  const playingRef = useRef(playing);
  const styleRef = useRef(style);
  const sensRef = useRef(sensitivity);
  useEffect(() => {
    playingRef.current = playing;
    saveSettings({ style, sensitivity, playing });
  }, [playing, style, sensitivity]);
  useEffect(() => void (styleRef.current = style), [style]);
  useEffect(() => void (sensRef.current = sensitivity), [sensitivity]);

  // Touch gesture refs
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    const W = (canvas.width = 480);
    const H = (canvas.height = 360);

    const buf = document.createElement("canvas");
    buf.width = W;
    buf.height = H;
    const bctx = buf.getContext("2d", { alpha: false })!;
    bctx.fillStyle = "#000";
    bctx.fillRect(0, 0, W, H);

    let raf = 0;
    let t = 0;
    let last = performance.now();

    const tick = () => {
      const now = performance.now();
      if (playingRef.current) t += (now - last) / 1000;
      last = now;

      const s = styleRef.current;
      const sens = sensRef.current;

      // ---- feedback warp (style-dependent) ----
      let zoom = 1.025 + 0.015 * Math.sin(t * 0.7);
      let angle = 0.01 * Math.sin(t * 0.4);
      if (s === "tunnel") {
        zoom = 1.06;
        angle = 0.015;
      } else if (s === "mirror") {
        zoom = 1.0;
        angle = 0.04 * Math.sin(t * 0.6);
      } else if (s === "plasma") {
        zoom = 1.005;
        angle = 0;
      }

      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.rotate(angle);
      ctx.scale(zoom, zoom);
      ctx.globalAlpha = 0.94;
      ctx.drawImage(buf, -W / 2, -H / 2);
      ctx.restore();

      ctx.globalAlpha = s === "plasma" ? 0.12 : 0.06;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;

      const beat = 0.5 + 0.5 * Math.sin(t * 3.1);
      const amp = H * 0.18 * (0.6 + 0.4 * beat) * sens;
      const hue = (t * 40) % 360;

      ctx.lineWidth = 2 + beat * 1.5;
      ctx.shadowColor = `hsl(${(hue + 60) % 360}, 100%, 60%)`;
      ctx.shadowBlur = 8;

      const drawWave = (color: string, fn: (u: number) => number) => {
        ctx.strokeStyle = color;
        ctx.beginPath();
        for (let x = 0; x <= W; x += 2) {
          const u = x / W;
          const y = H / 2 + fn(u);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };

      if (s === "classic" || s === "tunnel") {
        drawWave(
          `hsl(${hue}, 100%, ${55 + beat * 15}%)`,
          (u) =>
            Math.sin(u * 18 + t * 2) * amp * 0.6 +
            Math.sin(u * 7 - t * 1.3) * amp * 0.4 +
            Math.sin(u * 3 + t * 0.5) * amp * 0.3,
        );
        drawWave(
          `hsl(${(hue + 180) % 360}, 100%, 60%)`,
          (u) => Math.cos(u * 14 - t * 1.7) * amp * 0.5 + Math.sin(u * 5 + t * 0.9) * amp * 0.5,
        );
      } else if (s === "mirror") {
        const wave = (u: number) =>
          Math.sin(u * 12 + t * 2) * amp * 0.7 + Math.sin(u * 4 - t * 1.1) * amp * 0.4;
        drawWave(`hsl(${hue}, 100%, 65%)`, wave);
        drawWave(`hsl(${(hue + 120) % 360}, 100%, 65%)`, (u) => -wave(u));
      } else if (s === "plasma") {
        // radial plasma blobs
        for (let i = 0; i < 5; i++) {
          const cx = W / 2 + Math.cos(t * 0.5 + i) * W * 0.3;
          const cy = H / 2 + Math.sin(t * 0.7 + i * 1.3) * H * 0.3;
          const r = 40 + 30 * Math.sin(t * 1.5 + i) * sens;
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.abs(r) + 1);
          g.addColorStop(0, `hsla(${(hue + i * 60) % 360}, 100%, 65%, 0.9)`);
          g.addColorStop(1, "hsla(0,0%,0%,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(cx, cy, Math.abs(r) + 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.shadowBlur = 0;
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = `hsl(${(hue + i * 40) % 360}, 100%, 75%)`;
        ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2);
      }

      bctx.drawImage(canvas, 0, 0);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExitRef.current();
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
      if (e.key === "ArrowRight") {
        setStyle((s) => STYLES[(STYLES.indexOf(s) + 1) % STYLES.length]);
      }
      if (e.key === "ArrowLeft") {
        setStyle((s) => STYLES[(STYLES.indexOf(s) - 1 + STYLES.length) % STYLES.length]);
      }
      if (e.key === "ArrowUp") {
        setSensitivity((v) => Math.min(2.5, +(v + 0.1).toFixed(1)));
      }
      if (e.key === "ArrowDown") {
        setSensitivity((v) => Math.max(0.2, +(v - 0.1).toFixed(1)));
      }
    };
    window.addEventListener("keydown", onKey);

    // ── Mouse wheel: cycle styles ──
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        setStyle((s) => STYLES[(STYLES.indexOf(s) + 1) % STYLES.length]);
      } else {
        setStyle((s) => STYLES[(STYLES.indexOf(s) - 1 + STYLES.length) % STYLES.length]);
      }
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });

    // ── Touch: swipe horizontal = style, swipe vertical = sensitivity, tap = play/pause ──
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          t: Date.now(),
        };
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current || e.changedTouches.length !== 1) {
        touchStartRef.current = null;
        return;
      }
      const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
      const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
      const dt = Date.now() - touchStartRef.current.t;
      const dist = Math.sqrt(dx * dx + dy * dy);
      touchStartRef.current = null;

      if (dist < 15 && dt < 300) {
        // Tap — toggle play/pause
        setPlaying((p) => !p);
      } else if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        // Horizontal swipe — change style
        if (dx > 0) setStyle((s) => STYLES[(STYLES.indexOf(s) + 1) % STYLES.length]);
        else setStyle((s) => STYLES[(STYLES.indexOf(s) - 1 + STYLES.length) % STYLES.length]);
      } else if (Math.abs(dy) > 50 && Math.abs(dy) > Math.abs(dx) * 1.5) {
        // Vertical swipe — adjust sensitivity
        if (dy < 0) setSensitivity((v) => Math.min(2.5, +(v + 0.2).toFixed(1)));
        else setSensitivity((v) => Math.max(0.2, +(v - 0.2).toFixed(1)));
      }
    };
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  const accent = variant === "ps1" ? "#bcd3ff" : "#00ff66";

  return (
    <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center touch-none">
      <canvas
        ref={ref}
        className="w-full h-full"
        style={{ imageRendering: "pixelated", objectFit: "cover" }}
      />

      {/* Header label */}
      <div
        className="absolute top-4 left-4 text-[10px] tracking-[0.3em] uppercase pointer-events-none"
        style={{
          color: accent,
          fontFamily: "monospace",
          textShadow: "0 0 8px currentColor",
        }}
      >
        GEISS · {variant === "ps1" ? "PS1 CD VISUALIZER" : "WINAMP FULLSCREEN"}
      </div>

      {/* Control bar */}
      <div
        className="absolute left-1/2 bottom-6 -translate-x-1/2 flex items-center gap-3 px-4 py-2"
        style={{
          background: "rgba(0,0,0,0.65)",
          border: `1px solid ${accent}`,
          boxShadow: `0 0 12px ${accent}55, inset 0 0 8px rgba(0,0,0,0.8)`,
          fontFamily: "monospace",
          color: accent,
          fontSize: 11,
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        <button
          onClick={() => setPlaying((p) => !p)}
          className="px-2 py-1 hover:bg-white/10"
          style={{ border: `1px solid ${accent}66`, minWidth: 60 }}
          title="Space"
        >
          {playing ? "❚❚ Pause" : "▶ Play"}
        </button>

        <div className="flex items-center gap-1">
          <span className="opacity-60">Style</span>
          {STYLES.map((s) => (
            <button
              key={s}
              onClick={() => setStyle(s)}
              className="px-2 py-1 hover:bg-white/10"
              style={{
                border: `1px solid ${accent}66`,
                background: style === s ? `${accent}33` : "transparent",
                color: style === s ? "#fff" : accent,
                textShadow: style === s ? `0 0 6px ${accent}` : "none",
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="opacity-60">Sens</span>
          <input
            type="range"
            min={0.2}
            max={2.5}
            step={0.1}
            value={sensitivity}
            onChange={(e) => setSensitivity(Number(e.target.value))}
            style={{ width: 90, accentColor: accent }}
          />
          <span className="tabular-nums opacity-80" style={{ minWidth: 28 }}>
            {sensitivity.toFixed(1)}x
          </span>
        </div>

        <button
          onClick={onExit}
          className="px-2 py-1 hover:bg-white/10"
          style={{ border: `1px solid ${accent}66` }}
          title="Esc"
        >
          ✕ Exit
        </button>
      </div>

      {/* Touch hint for mobile */}
      <div
        className="absolute top-4 right-4 text-[9px] pointer-events-none opacity-40 sm:hidden"
        style={{ color: accent, fontFamily: "monospace" }}
      >
        SWIPE ←→ STYLE · ↕ SENS · TAP ▶⏸
      </div>
    </div>
  );
}
