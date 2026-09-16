import { Canvas } from "@react-three/fiber";
import { PS1Wireframe } from "./PS1Wireframe";
import { ProgramPanel } from "./ProgramPanel";
import type { SpotifyPlaylist, SpotifyPlaylistTrack } from "@/hooks/useSpotifyPlaylists";

interface Props {
  showSoundScope: boolean;
  showProgram: boolean;
  soundScopeMode: number;
  onCycleMode: () => void;
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

export function MainArea({
  showSoundScope,
  showProgram,
  soundScopeMode,
  onCycleMode,
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
    <div className="flex-1 flex flex-col items-center justify-center relative min-h-0">
      {!showProgram && (
        <div className="flex-1 flex items-center justify-center w-full">
          {showSoundScope ? (
            <div className="w-[90%] max-w-100 aspect-square relative" onClick={onCycleMode}>
              <div
                className="absolute inset-0 rounded-sm"
                style={{ border: "2px solid #1a1a4a", background: "#060618" }}
              >
                <Canvas camera={{ position: [0, 0, 3], fov: 50 }} style={{ borderRadius: "2px" }}>
                  <color attach="background" args={["#060618"]} />
                  <PS1Wireframe mode="tunnel" />
                </Canvas>
                <div
                  className="absolute bottom-2 right-3 text-[9px] uppercase tracking-widest"
                  style={{ color: "#335544" }}
                >
                  SoundScope {soundScopeMode + 1}/8
                </div>
              </div>
            </div>
          ) : (
            <div className="w-55 h-55 sm:w-70 sm:h-70">
              <Canvas camera={{ position: [0, 0, 3], fov: 45 }}>
                <color attach="background" args={["#0a0a28"]} />
                <ambientLight intensity={0.5} />
                <PS1Wireframe mode="tunnel" />
              </Canvas>
            </div>
          )}
        </div>
      )}

      {showProgram && (
        <ProgramPanel
          activePlaylist={activePlaylist}
          playlists={playlists}
          tracks={tracks}
          loading={loading}
          error={error}
          goBack={goBack}
          fetchTracks={fetchTracks}
          playTrack={playTrack}
          currentTrack={currentTrack}
        />
      )}
    </div>
  );
}
