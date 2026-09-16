import { useEffect, useRef, useState } from "react";

/**
 * PS1BootSequence - PlayStation 1 (FAT) boot intro.
 *
 * Uses the real assets from /public:
 *   - Video: /video/PlayStation Intro 1080p [Remastered].mp4
 *   - Audio: /audio/PS1 Startup - QuickSounds.com.mp3
 *
 * Flow:
 *   1. POWER button (console-grey, spring-loaded, LED indicator)
 *   2. Video + audio playback (the real PS1 BIOS intro)
 *   3. On video end or SKIP click -> onComplete() -> player
 *
 * The click on POWER is the user gesture that unlocks HTML5 media
 * playback (autoplay policy).
 */
export function PS1BootSequence({ onComplete }: { onComplete: () => void }) {
  const [stage, setStage] = useState<"power" | "booting" | "done">("power");
  const [skipped, setSkipped] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (stage !== "booting") return;
    if (skipped) {
      setStage("done");
      onComplete();
      return;
    }
    // Start media once the video element is mounted
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio) return;

    // Sync audio to video start
    const onVideoPlay = () => {
      audio.currentTime = video.currentTime;
      audio.play().catch(() => {});
    };
    const onEnded = () => {
      if (skipped) return;
      setStage("done");
      onComplete();
    };
    video.addEventListener("play", onVideoPlay);
    video.addEventListener("ended", onEnded);

    // Try to kick off playback
    video.play().catch(() => {});

    return () => {
      video.removeEventListener("play", onVideoPlay);
      video.removeEventListener("ended", onEnded);
    };
  }, [stage, skipped, onComplete]);

  const handlePowerClick = () => {
    setStage("booting");
  };

  const handleSkip = () => {
    if (stage === "done") return;
    setSkipped(true);
    setStage("done");
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden flex items-center justify-center">
      {/* CRT scanlines + vignette overlay */}
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

      {stage === "power" && <PowerButton onClick={handlePowerClick} />}

      {stage === "booting" && (
        <div className="relative z-10 w-full h-full flex items-center justify-center">
          <video
            ref={videoRef}
            src="/video/PlayStation Intro 1080p [Remastered].mp4"
            muted={false}
            playsInline
            className="max-w-full max-h-full w-auto h-auto object-contain"
            style={{ imageRendering: "auto" }}
          />
          <audio ref={audioRef} src="/audio/PS1 Startup - QuickSounds.com.mp3" preload="auto" />
          <button
            onClick={handleSkip}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 px-5 py-1.5 text-[10px] tracking-[0.3em] text-white/50 border border-white/10 hover:text-white/90 hover:border-white/30 transition"
            style={{ fontFamily: "var(--font-display)" }}
          >
            SKIP / START
          </button>
        </div>
      )}
    </div>
  );
}

// ── POWER button (PS1 FAT style) ────────────────────────────────────────
function PowerButton({ onClick }: { onClick: () => void }) {
  const [ledOn, setLedOn] = useState(false);

  return (
    <div className="flex flex-col items-center gap-6 select-none">
      <div className="flex items-center gap-3">
        <div
          className={`w-3 h-3 rounded-full transition-all duration-300 ${
            ledOn
              ? "bg-green-400 shadow-[0_0_12px_#00ff00,0_0_24px_#00ff00]"
              : "bg-green-900 shadow-[0_0_4px_rgba(0,0,0,0.6)]"
          }`}
        />
        <span
          className="text-[10px] tracking-[0.3em] uppercase"
          style={{ color: ledOn ? "#00ff00" : "#555" }}
        >
          POWER
        </span>
      </div>

      <button
        onClick={() => {
          setLedOn(true);
          onClick();
        }}
        className="relative w-28 h-28 rounded-full transition-all active:translate-y-1 active:scale-95 cursor-pointer"
        style={{
          background: "radial-gradient(circle at 35% 30%, #cfcfcf 0%, #a3a3a3 45%, #7a7a7a 100%)",
          boxShadow:
            "inset 0 3px 5px rgba(255,255,255,0.55), inset 0 -4px 8px rgba(0,0,0,0.45), 0 8px 14px rgba(0,0,0,0.55)",
          border: "3px solid #8a8a8a",
        }}
        aria-label="Power on"
      >
        <div
          className="absolute inset-3 rounded-full pointer-events-none"
          style={{
            border: "2px solid rgba(0,0,0,0.35)",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5)",
          }}
        />
        <span
          className="relative z-10 text-xs font-bold tracking-[0.25em]"
          style={{ color: "#2a2a2a", textShadow: "0 1px 0 rgba(255,255,255,0.4)" }}
        >
          POWER
        </span>
      </button>

      <p className="text-[9px] tracking-widest uppercase" style={{ color: "#444" }}>
        Press to boot
      </p>
    </div>
  );
}
