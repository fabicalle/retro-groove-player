import type { SpotifyPlaylist, SpotifyPlaylistTrack } from "@/hooks/useSpotifyPlaylists";

interface Props {
  activePlaylist: SpotifyPlaylist | null;
  playlists: SpotifyPlaylist[];
  tracks: SpotifyPlaylistTrack[];
  loading: boolean;
  error: string | null;
  goBack: () => void;
  fetchTracks: (playlist: SpotifyPlaylist) => void | Promise<void>;
  playTrack: (uri: string, contextUri?: string, deviceId?: string | null) => void;
  currentTrack: { name?: string; uri?: string } | null;
}

export function ProgramPanel({
  activePlaylist,
  playlists,
  tracks,
  loading,
  error,
  goBack,
  fetchTracks,
  playTrack,
  currentTrack,
}: Props) {
  return (
    <div className="flex-1 w-full flex flex-col min-h-0">
      <div
        className="flex items-center justify-between px-4 py-2 shrink-0"
        style={{ borderBottom: "1px solid #1a1a4a" }}
      >
        <div className="flex items-center gap-2">
          {activePlaylist && (
            <button onClick={goBack} className="text-sm" style={{ color: "#6666aa" }}>
              ◄
            </button>
          )}
          <span className="text-xs uppercase tracking-[0.2em]" style={{ color: "#6666aa" }}>
            {activePlaylist ? activePlaylist.name : "Select Disc"}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading && (
          <div className="text-xs text-center py-8 animate-pulse" style={{ color: "#4444aa" }}>
            Reading disc...
          </div>
        )}
        {error && (
          <div className="text-xs text-center py-8" style={{ color: "#aa4444" }}>
            ⚠ {error}
          </div>
        )}
        {!loading &&
          !activePlaylist &&
          playlists.map((pl) => (
            <button
              key={pl.id}
              onClick={() => fetchTracks(pl)}
              className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors"
              style={{ borderBottom: "1px solid #12122a" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#14143a")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span className="text-sm" style={{ color: "#5555aa" }}>
                💿
              </span>
              <span className="text-xs flex-1 truncate" style={{ color: "#8888cc" }}>
                {pl.name}
              </span>
              <span className="text-[10px]" style={{ color: "#3a3a6a" }}>
                {pl.tracks.total} tracks
              </span>
            </button>
          ))}
        {!loading &&
          activePlaylist &&
          tracks.map((track, i) => {
            const isActive = currentTrack?.uri === track.uri;
            return (
              <button
                key={track.id}
                onClick={() => playTrack(track.uri, `spotify:playlist:${activePlaylist.id}`)}
                className="w-full text-left px-4 py-2 flex items-center gap-3 transition-colors"
                style={{
                  borderBottom: "1px solid #12122a",
                  background: isActive ? "#1a1a4a" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = "#14143a";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = "transparent";
                }}
              >
                <span
                  className="text-[11px] w-6 text-right"
                  style={{
                    color: isActive ? "#88bbff" : "#3a3a6a",
                  }}
                >
                  {isActive ? "►" : String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs truncate"
                    style={{
                      color: isActive ? "#aaccff" : "#7777bb",
                    }}
                  >
                    {track.name}
                  </p>
                  <p className="text-[9px] truncate" style={{ color: "#3a3a6a" }}>
                    {track.artists[0]?.name}
                  </p>
                </div>
                <span className="text-[10px]" style={{ color: "#3a3a6a" }}>
                  {Math.floor(track.duration_ms / 60000)}:
                  {String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, "0")}
                </span>
              </button>
            );
          })}
        {!loading && !activePlaylist && playlists.length === 0 && (
          <div className="text-xs text-center py-8" style={{ color: "#3a3a6a" }}>
            No disc inserted
          </div>
        )}
      </div>
    </div>
  );
}
