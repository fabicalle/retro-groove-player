import { useEffect, useRef } from "react";

/**
 * Placeholder container for future PS1-style 3D rendering.
 * For now: animated faux-3D wireframe horizon to evoke the PSX vibe.
 */
export function PS1Container() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    let raf = 0;
    let off = 0;

    const draw = () => {
      off = (off + 0.5) % 20;
      // gradient sky
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#2a004a");
      g.addColorStop(0.6, "#ff2e88");
      g.addColorStop(1, "#0a0030");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // sun
      ctx.fillStyle = "#ffd24a";
      ctx.beginPath();
      ctx.arc(W / 2, H * 0.55, 22, 0, Math.PI * 2);
      ctx.fill();

      // grid floor
      ctx.strokeStyle = "#00ffe1";
      ctx.lineWidth = 1;
      const horizon = H * 0.55;
      // horizontal lines (perspective)
      for (let i = 0; i < 12; i++) {
        const y = horizon + Math.pow(i + off / 20, 2) * 2.2;
        if (y > H) break;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      // vertical lines (vanishing point)
      const vp = { x: W / 2, y: horizon };
      for (let i = -10; i <= 10; i++) {
        ctx.beginPath();
        ctx.moveTo(vp.x + i * 18, H);
        ctx.lineTo(vp.x, vp.y);
        ctx.stroke();
      }

      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={300}
        height={76}
        className="w-full h-full block"
        style={{ imageRendering: "pixelated" }}
      />
      <div className="scanlines absolute inset-0" />
      <div className="absolute top-1 left-1 text-[10px] lcd-text">
        PS1 MODE · 3D SLOT
      </div>
    </div>
  );
}
