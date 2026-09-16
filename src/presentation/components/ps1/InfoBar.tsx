interface Props {
  currentTrack: { name?: string; uri?: string; artists?: { name: string }[] } | null;
  position: number;
  duration: number;
  progressPct: number;
}

export function InfoBar({ currentTrack, position, duration, progressPct }: Props) {
  return (
    <div
      className="shrink-0 px-4 py-3"
      style={{
        borderTop: "2px solid #1a1a4a",
        background: "linear-gradient(180deg, #0e0e30 0%, #0c0c28 100%)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 min-w-0 mr-4">
          <p className="text-xs sm:text-sm truncate" style={{ color: "#8888cc" }}>
            {currentTrack?.name || "No Track"}
          </p>
          <p className="text-[10px] truncate" style={{ color: "#4a4a7a" }}>
            {currentTrack?.artists?.[0]?.name || "\u2014"}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p
            className="text-lg sm:text-2xl font-bold tracking-widest"
            style={{
              color: "#88bbff",
              textShadow: "0 0 8px rgba(100,150,255,0.3)",
            }}
          >
            {formatTime(position)}
          </p>
          {duration > 0 && (
            <p className="text-[10px]" style={{ color: "#3a3a6a" }}>
              / {formatTime(duration)}
            </p>
          )}
        </div>
      </div>
      <div
        className="h-1.5 w-full rounded-sm overflow-hidden"
        style={{ background: "#0a0a20", border: "1px solid #1a1a3a" }}
      >
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${progressPct}%`,
            background: "linear-gradient(90deg, #4466aa, #6688cc)",
          }}
        />
      </div>
    </div>
  );
}

function formatTime(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
