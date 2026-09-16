import { useState, useEffect } from "react";
import { useSpotifyPlayer } from "@/hooks/useSpotifyPlayer";
import { useSpotifyStore } from "@/store/useSpotifyStore";
import { useSpotifyPlaylists } from "@/hooks/useSpotifyPlaylists";
import { MainArea } from "./MainArea";
import { InfoBar } from "./InfoBar";
import { TransportBar } from "./TransportBar";

export function PS1Visualizer() {
  const [showSoundScope, setShowSoundScope] = useState(false);
  const [soundScopeMode, setSoundScopeMode] = useState(0);
  const [showProgram, setShowProgram] = useState(false);
  const { isPlaying, position, duration, shuffle, play, pause, next, prev, toggleShuffle } =
    useSpotifyPlayer();
  const { currentTrack } = useSpotifyStore();
  const {
    playlists,
    tracks,
    loading,
    activePlaylist,
    fetchPlaylists,
    fetchTracks,
    playTrack,
    goBack,
  } = useSpotifyPlaylists();
  const [repeatMode, setRepeatMode] = useState(0);

  useEffect(() => {
    if (showProgram && playlists.length === 0) fetchPlaylists();
  }, [showProgram, playlists.length, fetchPlaylists]);

  const progressPct = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col select-none overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #0c0c32 0%, #0a0a28 40%, #08081e 100%)",
        fontFamily: "'Courier New', 'Lucida Console', monospace",
      }}
    >
      <TopBar
        showSoundScope={showSoundScope}
        showProgram={showProgram}
        onToggleSoundScope={() => {
          setShowSoundScope((v) => !v);
          setShowProgram(false);
        }}
        onToggleProgram={() => {
          setShowProgram((v) => !v);
          setShowSoundScope(false);
        }}
      />
      <MainArea
        showSoundScope={showSoundScope}
        showProgram={showProgram}
        soundScopeMode={soundScopeMode}
        onCycleMode={() => setSoundScopeMode((m) => (m + 1) % 8)}
        activePlaylist={activePlaylist}
        playlists={playlists}
        tracks={tracks}
        loading={loading}
        error={null}
        goBack={goBack}
        fetchTracks={fetchTracks}
        playTrack={playTrack}
        currentTrack={currentTrack}
      />
      <InfoBar
        currentTrack={currentTrack}
        position={position}
        duration={duration}
        progressPct={progressPct}
      />
      <TransportBar
        isPlaying={isPlaying}
        repeatMode={repeatMode}
        shuffle={shuffle}
        onPlay={play}
        onPause={pause}
        onPrev={prev}
        onNext={next}
        onRepeat={() => setRepeatMode((r) => (r + 1) % 3)}
        onShuffle={toggleShuffle}
      />
    </div>
  );
}

function TopBar({
  showSoundScope,
  showProgram,
  onToggleSoundScope,
  onToggleProgram,
}: {
  showSoundScope: boolean;
  showProgram: boolean;
  onToggleSoundScope: () => void;
  onToggleProgram: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between px-4 py-2 shrink-0"
      style={{
        borderBottom: "2px solid #1a1a4a",
        background: "linear-gradient(180deg, #141440 0%, #0e0e30 100%)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-4 h-4 sm:w-5 sm:h-5"
          style={{
            background: "linear-gradient(135deg, #e8b800 0%, #e85020 50%, #4060e0 100%)",
            clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
          }}
        />
        <span
          className="text-xs sm:text-sm tracking-[0.25em] uppercase"
          style={{ color: "#8888cc" }}
        >
          CD Player
        </span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onToggleSoundScope}
          className="text-[10px] sm:text-xs px-2 py-1 tracking-wider uppercase"
          style={{
            color: showSoundScope ? "#88ccff" : "#555588",
            border: `1px solid ${showSoundScope ? "#4466aa" : "#2a2a4a"}`,
            borderRadius: "2px",
            background: showSoundScope ? "#1a2a4a" : "transparent",
          }}
        >
          SoundScope
        </button>
        <button
          onClick={onToggleProgram}
          className="text-[10px] sm:text-xs px-2 py-1 tracking-wider uppercase"
          style={{
            color: showProgram ? "#88ccff" : "#555588",
            border: `1px solid ${showProgram ? "#4466aa" : "#2a2a4a"}`,
            borderRadius: "2px",
            background: showProgram ? "#1a2a4a" : "transparent",
          }}
        >
          Program
        </button>
      </div>
    </div>
  );
}
