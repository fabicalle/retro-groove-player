import { useEffect, useRef } from "react";

export function WaveVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    let raf = 0;
    let t = 0;

    const bars = 19;
    const peaks = new Array(bars).fill(0);

    const draw = () => {
      t += 0.08;
      ctx.fillStyle = "#0a0e0a";
      ctx.fillRect(0, 0, W, H);

      const barW = Math.floor(W / bars) - 2;
      for (let i = 0; i < bars; i++) {
        const v =
          Math.abs(Math.sin(t + i * 0.5) * 0.6) +
          Math.abs(Math.sin(t * 1.7 + i) * 0.4) +
          Math.random() * 0.15;
        const h = Math.min(H - 4, v * H);
        peaks[i] = Math.max(peaks[i] - 0.5, h);

        const x = 2 + i * (barW + 2);
        // segmented bar (Winamp style)
        const segH = 3;
        for (let y = H - 2; y > H - h; y -= segH + 1) {
          const ratio = (H - y) / H;
          const hue =
            ratio < 0.4 ? "#1bff5a" : ratio < 0.7 ? "#e8ff1b" : "#ff3b1b";
          ctx.fillStyle = hue;
          ctx.fillRect(x, y - segH, barW, segH);
        }
        // peak marker
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x, H - peaks[i] - 2, barW, 1);
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={76}
      className="w-full h-full block"
      style={{ imageRendering: "pixelated" }}
    />
  );
}
