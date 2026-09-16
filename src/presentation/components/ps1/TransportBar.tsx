interface Props {
  isPlaying: boolean;
  repeatMode: number;
  shuffle: boolean;
  onPlay: () => void;
  onPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onRepeat: () => void;
  onShuffle: () => void;
}

export function TransportBar({
  isPlaying,
  repeatMode,
  shuffle,
  onPlay,
  onPause,
  onPrev,
  onNext,
  onRepeat,
  onShuffle,
}: Props) {
  return (
    <div
      className="shrink-0 flex items-center justify-center gap-2 sm:gap-3 px-4 py-3 sm:py-4"
      style={{
        borderTop: "2px solid #1a1a4a",
        background: "linear-gradient(180deg, #121238 0%, #0a0a28 100%)",
      }}
    >
      <PS1Button onClick={() => onPause()}>
        <span className="text-xs">■</span>
      </PS1Button>
      <PS1Button onClick={onPrev}>
        <span className="text-xs">|◄◄</span>
      </PS1Button>
      <PS1Button onClick={isPlaying ? onPause : onPlay} active={isPlaying}>
        <span className="text-sm">{isPlaying ? "❚❚" : "►"}</span>
      </PS1Button>
      <PS1Button onClick={onNext}>
        <span className="text-xs">►►|</span>
      </PS1Button>
      <PS1Button onClick={onRepeat} active={repeatMode > 0}>
        <span className="text-[10px]">
          {repeatMode === 0 ? "RPT" : repeatMode === 1 ? "ALL" : "1"}
        </span>
      </PS1Button>
      <PS1Button onClick={onShuffle} active={shuffle}>
        <span className="text-[10px]">SHFL</span>
      </PS1Button>
    </div>
  );
}

function PS1Button({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="relative select-none active:translate-y-px w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-sm sm:text-base transition-all duration-75"
      style={{
        background: active
          ? "linear-gradient(180deg, #5a7a9a 0%, #3a5a7a 50%, #2a4a6a 100%)"
          : "linear-gradient(180deg, #8a8a9a 0%, #6a6a7a 50%, #4a4a5a 100%)",
        borderTop: "2px solid #b0b0c0",
        borderLeft: "2px solid #a0a0b0",
        borderRight: "2px solid #3a3a4a",
        borderBottom: "2px solid #2a2a3a",
        borderRadius: "3px",
        color: active ? "#c0e8ff" : "#d0d0e0",
        textShadow: "0 1px 2px rgba(0,0,0,0.5)",
        boxShadow: "0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
      }}
    >
      {children}
    </button>
  );
}
