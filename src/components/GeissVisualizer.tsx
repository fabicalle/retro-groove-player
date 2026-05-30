import { useEffect, useRef } from "react";

/**
 * Approximation of Ryan Geiss' 1998 Winamp visualizer:
 *  - Feedback zoom/warp of the previous frame
 *  - Audio-reactive waveform overlay (faked with synthesized sine bands)
 *  - Cycling HSL palette
 * Renders to a full-viewport canvas. Click or ESC to exit.
 */
export function GeissVisualizer({
  onExit,
  variant = "winamp",
}: {
  onExit: () => void;
  variant?: "winamp" | "ps1";
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d", { alpha: false })!;

    const W = (canvas.width = 480);
    const H = (canvas.height = 360);

    // offscreen buffer for feedback
    const buf = document.createElement("canvas");
    buf.width = W;
    buf.height = H;
    const bctx = buf.getContext("2d", { alpha: false })!;
    bctx.fillStyle = "#000";
    bctx.fillRect(0, 0, W, H);

    let raf = 0;
    let t = 0;
    const start = performance.now();

    const tick = () => {
      t = (performance.now() - start) / 1000;

      // 1) Feedback warp: draw previous frame zoomed + rotated slightly
      const zoom = 1.025 + 0.015 * Math.sin(t * 0.7);
      const angle = 0.01 * Math.sin(t * 0.4);
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.rotate(angle);
      ctx.scale(zoom, zoom);
      ctx.globalAlpha = 0.94;
      ctx.drawImage(buf, -W / 2, -H / 2);
      ctx.restore();

      // 2) Slight darkening to avoid saturation
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;

      // 3) Waveform — synthesized: 3 stacked sines, mid-band beat envelope
      const beat = 0.5 + 0.5 * Math.sin(t * 3.1);
      const amp = H * 0.18 * (0.6 + 0.4 * beat);
      const hue = (t * 40) % 360;
      ctx.lineWidth = 2 + beat * 1.5;
      ctx.strokeStyle = `hsl(${hue}, 100%, ${55 + beat * 15}%)`;
      ctx.shadowColor = `hsl(${(hue + 60) % 360}, 100%, 60%)`;
      ctx.shadowBlur = 8;

      ctx.beginPath();
      for (let x = 0; x <= W; x += 2) {
        const u = x / W;
        const y =
          H / 2 +
          Math.sin(u * 18 + t * 2) * amp * 0.6 +
          Math.sin(u * 7 - t * 1.3) * amp * 0.4 +
          Math.sin(u * 3 + t * 0.5) * amp * 0.3;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // 4) Second mirrored wave for that Geiss symmetry feel
      ctx.strokeStyle = `hsl(${(hue + 180) % 360}, 100%, 60%)`;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 2) {
        const u = x / W;
        const y =
          H / 2 +
          Math.cos(u * 14 - t * 1.7) * amp * 0.5 +
          Math.sin(u * 5 + t * 0.9) * amp * 0.5;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // 5) Sparkle dots
      ctx.shadowBlur = 0;
      for (let i = 0; i < 6; i++) {
        const px = Math.random() * W;
        const py = Math.random() * H;
        ctx.fillStyle = `hsl(${(hue + i * 40) % 360}, 100%, 75%)`;
        ctx.fillRect(px, py, 2, 2);
      }

      // 6) Copy back into feedback buffer
      bctx.drawImage(canvas, 0, 0);

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
  }, [onExit]);

  return (
    <div
      onClick={onExit}
      className="fixed inset-0 z-[60] bg-black flex items-center justify-center cursor-pointer"
    >
      <canvas
        ref={ref}
        className="w-full h-full"
        style={{ imageRendering: "pixelated", objectFit: "cover" }}
      />
      <div
        className="absolute top-4 left-4 text-[10px] tracking-[0.3em] uppercase pointer-events-none"
        style={{
          color: variant === "ps1" ? "#bcd3ff" : "#00ff66",
          fontFamily: "monospace",
          textShadow: "0 0 8px currentColor",
        }}
      >
        GEISS · {variant === "ps1" ? "PS1 CD VISUALIZER" : "WINAMP FULLSCREEN"}
      </div>
      <div
        className="absolute bottom-4 right-4 text-[10px] tracking-[0.3em] uppercase pointer-events-none"
        style={{
          color: "rgba(255,255,255,0.5)",
          fontFamily: "monospace",
        }}
      >
        CLICK / ESC TO EXIT
      </div>
    </div>
  );
}
