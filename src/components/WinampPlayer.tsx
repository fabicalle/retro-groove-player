import { useEffect, useState } from "react";
import { WaveVisualizer } from "./WaveVisualizer";
import { SpotifyConnect } from "./SpotifyConnect";
import { GeissVisualizer } from "./GeissVisualizer";

export function WinampPlayer({ onSwitchToPS1 }: { onSwitchToPS1: () => void }) {
  const [playing, setPlaying] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [vol, setVol] = useState(75);
  const [bal, setBal] = useState(50);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setElapsed((e) => (e + 1) % 257), 1000);
    return () => clearInterval(id);
  }, [playing]);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="w-[460px] max-w-full select-none">
      <div className="bevel-out p-[2px]">
        <div className="title-bar-gradient flex items-center justify-between px-2 py-[3px]">
          <span className="text-[10px] font-bold tracking-widest text-white/90 uppercase">
            ▣ Y2K Player 2.95
          </span>
          <div className="flex gap-1">
            {["_", "▢", "✕"].map((c) => (
              <button
                key={c}
                className="bevel-btn w-4 h-4 text-[9px] leading-none flex items-center justify-center text-black"
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="bevel-out flex items-stretch gap-[2px] p-[2px] border-t-0">
          <MenuItem>File</MenuItem>
          <MenuItem>Play</MenuItem>
          <MenuItem>Options</MenuItem>
          <div className="flex-1" />
          <button
            onClick={onSwitchToPS1}
            className="bevel-btn px-3 text-xs font-bold text-black hover:bg-[var(--winamp-chrome-light)]"
            title="Switch to PS1 BIOS CD Player"
          >
            ◆ PS1 Mode
          </button>
        </div>

        <div className="bevel-out p-2 space-y-2 border-t-0">
          <div className="flex gap-2">
            <div className="bevel-in px-2 py-1 flex flex-col items-center justify-center min-w-[88px]">
              <span className="lcd-text text-3xl leading-none font-bold tabular-nums">
                {fmt(elapsed)}
              </span>
              <div className="flex gap-2 mt-1 text-[9px] lcd-text">
                <span>kbps 128</span>
                <span>kHz 44</span>
                <span>STEREO</span>
              </div>
            </div>
            <div
              className="bevel-in flex-1 overflow-hidden relative"
              style={{ height: 76 }}
            >
              <WaveVisualizer />
            </div>
          </div>

          <div className="bevel-in px-2 py-1 overflow-hidden">
            <div className="lcd-text text-sm whitespace-nowrap animate-[marquee_18s_linear_infinite]">
              ★ 01. The Prodigy — Smack My Ash Up · (4:17) ·····  Y2K
              Player · WINAMP MODE ·····
            </div>
            <style>{`@keyframes marquee { from { transform: translateX(100%);} to {transform: translateX(-100%);} }`}</style>
          </div>

          <div className="flex items-center gap-2">
            <Slider label="VOL" value={vol} onChange={setVol} />
            <Slider label="BAL" value={bal} onChange={setBal} />
            <div className="bevel-in px-2 py-1 flex-1">
              <div className="h-2 bg-black/50 relative">
                <div
                  className="absolute inset-y-0 left-0 bg-[var(--winamp-lcd)]"
                  style={{ width: `${(elapsed / 257) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {[
              { l: "◄◄", t: "prev" },
              { l: "►", t: "play", on: () => setPlaying(true) },
              { l: "▮▮", t: "pause", on: () => setPlaying(false) },
              { l: "■", t: "stop", on: () => { setPlaying(false); setElapsed(0); } },
              { l: "►►", t: "next" },
              { l: "◉", t: "eject" },
            ].map((b) => (
              <button
                key={b.t}
                onClick={b.on}
                className="bevel-btn w-10 h-7 text-sm font-bold text-black hover:brightness-110"
              >
                {b.l}
              </button>
            ))}
            <div className="flex-1" />
            <Toggle label="EQ" />
            <Toggle label="PL" />
          </div>

          <SpotifyConnect />
        </div>
      </div>

      <div className="mt-3 bevel-out px-3 py-1 flex justify-between text-[10px] uppercase tracking-wider text-black/80">
        <span>● {playing ? "Playing" : "Stopped"}</span>
        <span>Mode: 2D Wave</span>
        <span>v2.95 · Y2K</span>
      </div>
    </div>
  );
}

function MenuItem({ children }: { children: React.ReactNode }) {
  return (
    <button className="bevel-btn px-2 text-xs text-black hover:bg-[var(--winamp-chrome-light)]">
      {children}
    </button>
  );
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[9px] lcd-text">{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 h-2 accent-[var(--winamp-lcd)]"
      />
    </div>
  );
}

function Toggle({ label }: { label: string }) {
  const [on, setOn] = useState(false);
  return (
    <button
      onClick={() => setOn((v) => !v)}
      className="bevel-btn px-2 h-7 text-[10px] font-bold text-black"
      style={{
        color: on ? "var(--winamp-lcd)" : "black",
        textShadow: on ? "0 0 4px var(--winamp-lcd)" : "none",
        background: on ? "var(--winamp-chrome-dark)" : "var(--winamp-chrome)",
      }}
    >
      {label}
    </button>
  );
}
