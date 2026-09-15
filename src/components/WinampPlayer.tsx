import { useEffect, useState, useCallback } from "react";
import { WaveVisualizer } from "./WaveVisualizer";
import { SpotifyConnect } from "./SpotifyConnect";
import { GeissVisualizer } from "./GeissVisualizer";
import { useSpotifyStore } from "../store/useSpotifyStore";
import { useSpotifyPlaylists } from "../hooks/useSpotifyPlaylists";
import { useSpotifyPlayer } from "../hooks/useSpotifyPlayer";

export function WinampPlayer({ onSwitchToPS1 }: { onSwitchToPS1: () => void }) {
  const [playing, setPlaying] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [vol, setVol] = useState(75);
  const [bal, setBal] = useState(50);
  const [geiss, setGeiss] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);

  const { isAuthenticated, currentTrack } = useSpotifyStore();
  const {
    playlists,
    tracks,
    loading,
    error,
    activePlaylist,
    fetchPlaylists,
    fetchTracks,
    playTrack,
    playPlaylist,
    goBack,
  } = useSpotifyPlaylists();
  const spotify = useSpotifyPlayer();

  // Sync playing state with Spotify
  useEffect(() => {
    if (isAuthenticated && spotify.isReady) {
      setPlaying(spotify.isPlaying);
    }
  }, [isAuthenticated, spotify.isReady, spotify.isPlaying]);

  const handleFileClick = useCallback(() => {
    if (!isAuthenticated) return;
    const willOpen = !showPlaylist;
    setShowPlaylist(willOpen);
    if (willOpen) fetchPlaylists();
  }, [isAuthenticated, showPlaylist, fetchPlaylists]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setElapsed((e) => (e + 1) % 257), 1000);
    return () => clearInterval(id);
  }, [playing]);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <>
      {geiss && <GeissVisualizer variant="winamp" onExit={() => setGeiss(false)} />}
      <div className="w-[460px] max-w-full select-none">
        <div className="bevel-out p-[2px]">
          <div className="title-bar-gradient flex items-center justify-between px-2 py-[3px]">
            <span className="text-[10px] font-bold tracking-widest text-white/90 uppercase">
              ▣ Y2K Player 2.95
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setGeiss(true)}
                title="Fullscreen visualizer (Geiss)"
                className="bevel-btn w-4 h-4 text-[9px] leading-none flex items-center justify-center text-black"
              >
                ⛶
              </button>
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
            <button
              onClick={handleFileClick}
              className="bevel-btn px-2 text-xs text-black hover:bg-[var(--winamp-chrome-light)]"
              style={{
                color: showPlaylist ? "var(--winamp-lcd)" : undefined,
                textShadow: showPlaylist ? "0 0 4px var(--winamp-lcd)" : "none",
              }}
              title={isAuthenticated ? "Browse Spotify playlists" : "Connect Spotify first"}
            >
              File
            </button>
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
              <div className="bevel-in flex-1 overflow-hidden relative" style={{ height: 76 }}>
                <WaveVisualizer />
              </div>
            </div>

            <div className="bevel-in px-2 py-1 overflow-hidden">
              <div className="lcd-text text-sm whitespace-nowrap animate-[marquee_18s_linear_infinite]">
                {currentTrack?.name
                  ? `★ ${currentTrack.name} — ${(currentTrack.artists ?? []).map((a: { name: string }) => a.name).join(", ")} ····· Y2K Player · SPOTIFY ·····`
                  : "★ 01. The Prodigy — Smack My Ash Up · (4:17) ····· Y2K Player · WINAMP MODE ·····"}
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
                {
                  l: "◄◄",
                  t: "prev",
                  on: () => {
                    if (isAuthenticated && spotify.isReady) spotify.prev();
                  },
                },
                {
                  l: "►",
                  t: "play",
                  on: () => {
                    if (isAuthenticated && spotify.isReady) spotify.play();
                    setPlaying(true);
                  },
                },
                {
                  l: "▮▮",
                  t: "pause",
                  on: () => {
                    if (isAuthenticated && spotify.isReady) spotify.pause();
                    setPlaying(false);
                  },
                },
                {
                  l: "■",
                  t: "stop",
                  on: () => {
                    if (isAuthenticated && spotify.isReady) spotify.pause();
                    setPlaying(false);
                    setElapsed(0);
                  },
                },
                {
                  l: "►►",
                  t: "next",
                  on: () => {
                    if (isAuthenticated && spotify.isReady) spotify.next();
                  },
                },
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

        {/* ── Winamp-style Playlist Panel ── */}
        {showPlaylist && isAuthenticated && (
          <div className="mt-[2px] bevel-out p-[2px]">
            <div className="title-bar-gradient px-2 py-[2px] flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-widest text-white/90 uppercase">
                {activePlaylist ? `▸ ${activePlaylist.name}` : "▣ Spotify Playlists"}
              </span>
              {activePlaylist && (
                <button
                  onClick={goBack}
                  className="text-[10px] text-white/70 hover:text-white px-1"
                >
                  ◄ Back
                </button>
              )}
            </div>
            <div
              className="bevel-in bg-black/90 overflow-y-auto"
              style={{ maxHeight: 200, minHeight: 60 }}
            >
              {loading && (
                <div className="lcd-text text-xs text-center py-4 animate-pulse">Loading…</div>
              )}

              {/* Playlist list */}
              {!loading && !activePlaylist && playlists.length > 0 && (
                <div>
                  {playlists.map((pl, i) => (
                    <button
                      key={pl.id}
                      onClick={() => {
                        console.log("[WinampPlayer] Playlist clicked:", pl.id, pl.name);
                        fetchTracks(pl);
                      }}
                      onDoubleClick={() => playPlaylist(pl.id, spotify.deviceId)}
                      className="w-full text-left px-2 py-[3px] flex items-center gap-2 hover:bg-[var(--winamp-lcd)]/20 group"
                    >
                      <span className="lcd-text text-[10px] opacity-50 w-4 text-right">
                        {i + 1}.
                      </span>
                      <span className="lcd-text text-xs truncate flex-1">{pl.name}</span>
                      <span className="lcd-text text-[10px] opacity-40">
                        {pl.tracks?.total ?? 0} trks
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Track list inside a playlist */}
              {!loading && activePlaylist && tracks.length > 0 && (
                <div>
                  {/* Play all button */}
                  <button
                    onClick={() => playPlaylist(activePlaylist.id, spotify.deviceId)}
                    className="w-full text-left px-2 py-[3px] lcd-text text-xs hover:bg-[var(--winamp-lcd)]/20"
                    style={{ color: "var(--winamp-lcd)" }}
                  >
                    ▶ Play All ({tracks.length} tracks)
                  </button>
                  <div className="border-t border-white/10" />
                  {tracks.map((tr, i) => (
                    <button
                      key={tr.id}
                      onClick={() =>
                        playTrack(tr.uri, `spotify:playlist:${activePlaylist.id}`, spotify.deviceId)
                      }
                      className="w-full text-left px-2 py-[3px] flex items-center gap-2 hover:bg-[var(--winamp-lcd)]/20"
                    >
                      <span className="lcd-text text-[10px] opacity-50 w-5 text-right">
                        {i + 1}.
                      </span>
                      <span className="lcd-text text-xs truncate flex-1">
                        {tr.artists.map((a) => a.name).join(", ")} — {tr.name}
                      </span>
                      <span className="lcd-text text-[10px] opacity-40">
                        {Math.floor(tr.duration_ms / 60000)}:
                        {String(Math.floor((tr.duration_ms % 60000) / 1000)).padStart(2, "0")}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Empty tracks / error state */}
              {!loading && activePlaylist && tracks.length === 0 && (
                <div className="lcd-text text-xs text-center py-4 opacity-50">
                  {error || "No tracks in this playlist"}
                </div>
              )}

              {!loading && !activePlaylist && playlists.length === 0 && (
                <div className="lcd-text text-xs text-center py-4 opacity-50">
                  {error || "No playlists found"}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-3 bevel-out px-3 py-1 flex justify-between text-[10px] uppercase tracking-wider text-black/80">
          <span>● {playing ? "Playing" : "Stopped"}</span>
          <span>Mode: 2D Wave</span>
          <span>v2.95 · Y2K</span>
        </div>
      </div>
    </>
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
