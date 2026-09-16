import { useEffect, useRef, useState } from "react";
import { useAudioStore, type VisualizerMode } from "@/store/useAudioStore";

/**
 * Winamp 2.x-style Spectrum Analyzer + Oscilloscope.
 *
 * - Pixel grid: black separators between each 2x2 pixel block recreate the
 *   classic LED-matrix look.
 * - Falling peak hold: each bar keeps a "peak" marker that decays with
 *   gravity when the signal drops.
 * - Oscilloscope mode: a green phosphor waveform reactive to the energy.
 *
 * The component reads the spectrum imperatively from the rAF-driven
 * `useAudioStore` (no React re-render per frame). Peak-hold state lives in
 * a module-level ref so the module-scope `drawBars` helper can reach it.
 */

const BARS = 32;
const GRID = 2; // pixels per LED block
const PALETTE = {
  low: "#1bff5a",
  mid: "#e8ff1b",
  high: "#ff3b1b",
  peak: "#ffffff",
  oscilloscope: "#00ff66",
};

// Module-level peak-hold state — persists across remounts and is reachable
// by the module-scope draw functions.
const peaksRef = { current: new Float32Array(BARS) };

interface Props {
  width?: number;
  height?: number;
  mode?: VisualizerMode;
  onModeChange?: (mode: VisualizerMode) => void;
}

export function WinampVisualizer({
  width = 300,
  height = 76,
  mode: controlledMode,
  onModeChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [internalMode, setInternalMode] = useState<VisualizerMode>("bars");
  const mode = controlledMode ?? internalMode;
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    // HiDPI backing store
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const draw = () => {
      const frame = useAudioStore.getState().frame;
      const bins = frame?.bins ?? new Uint8Array(64);
      const energy = frame?.energy ?? 0;
      const beat = frame?.beat ?? 0;

      // Background
      ctx.fillStyle = "#0a0e0a";
      ctx.fillRect(0, 0, width, height);

      if (mode === "oscilloscope") {
        drawOscilloscope(ctx, bins, energy, beat);
      } else {
        drawBars(ctx, bins);
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [width, height, mode]);

  const toggleMode = () => {
    const next: VisualizerMode = mode === "bars" ? "oscilloscope" : "bars";
    setInternalMode(next);
    onModeChange?.(next);
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="w-full h-full block cursor-pointer"
      style={{ imageRendering: "pixelated" }}
      onClick={toggleMode}
      title="Click to toggle bars / oscilloscope"
    />
  );
}

function drawBars(ctx: CanvasRenderingContext2D, bins: Uint8Array) {
  const { width: W, height: H } = ctx.canvas;
  const peaks = peaksRef.current;
  const barW = Math.floor(W / BARS) - 2;

  for (let i = 0; i < BARS; i++) {
    // Map 64 bins to 32 bars (2 bins per bar), take the max
    const v0 = (bins[i * 2] ?? 0) / 255;
    const v1 = (bins[i * 2 + 1] ?? 0) / 255;
    const v = Math.max(v0, v1);
    const barH = Math.max(1, v * H);

    // Peak hold with gravity decay
    if (v > peaks[i]) {
      peaks[i] = v;
    } else {
      const gap = peaks[i] - v;
      peaks[i] = Math.max(v, peaks[i] - gap * 0.08 - 0.006);
    }
    const peakY = H - peaks[i] * H;

    const x = 2 + i * (barW + 2);

    // Color by height (classic Winamp gradient)
    const ratio = barH / H;
    const color = ratio < 0.4 ? PALETTE.low : ratio < 0.7 ? PALETTE.mid : PALETTE.high;

    // Segmented bar (Winamp style)
    const segH = 3;
    for (let y = H - 2; y > H - barH; y -= segH + 1) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y - segH, barW, segH);
    }

    // Pixel grid separators
    ctx.fillStyle = "#000";
    // Vertical separator to the left of each bar
    if (i > 0) ctx.fillRect(x - 1, 0, 1, H);
    // Horizontal separator every GRID pixels
    for (let y = 0; y < H; y += GRID) {
      ctx.fillRect(x, y, barW, 1);
    }

    // Peak marker
    ctx.fillStyle = PALETTE.peak;
    ctx.fillRect(x, peakY - 1, barW, 1);
  }
}

function drawOscilloscope(
  ctx: CanvasRenderingContext2D,
  bins: Uint8Array,
  energy: number,
  beat: number,
) {
  const { width: W, height: H } = ctx.canvas;
  const cx = W / 2;
  const cy = H / 2;

  // Faint grid
  ctx.strokeStyle = "rgba(0,255,102,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(W, cy);
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, H);
  ctx.stroke();

  // Waveform: use the 64 bins as a 128-point wave (mirrored)
  const amp = 0.35 + 0.15 * beat + 0.1 * energy;
  ctx.strokeStyle = PALETTE.oscilloscope;
  ctx.lineWidth = 2;
  ctx.shadowColor = PALETTE.oscilloscope;
  ctx.shadowBlur = 8;
  ctx.beginPath();

  const points = 128;
  for (let i = 0; i <= points; i++) {
    const u = i / points;
    const binIdx = Math.min(63, Math.floor(u * 64));
    const v = (bins[binIdx] ?? 0) / 255;
    const x = u * W;
    const y = cy + Math.sin(u * Math.PI * 8 + v * 4) * (H * amp) * (0.5 + v);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
}
