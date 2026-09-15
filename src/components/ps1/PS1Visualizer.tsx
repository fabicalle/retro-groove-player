import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSpotifyPlayer } from "@/hooks/useSpotifyPlayer";
import { useSpotifyPlaylists } from "@/hooks/useSpotifyPlaylists";
import { useSpotifyStore } from "@/store/useSpotifyStore";

/* ══════════════════════════════════════════════════════════════════
   SPINNING CD DISC — 3D disc that rotates when playing
   ══════════════════════════════════════════════════════════════════ */
function SpinningDisc({ isPlaying }: { isPlaying: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    if (isPlaying) groupRef.current.rotation.z -= 0.012;
  });

  return (
    <group ref={groupRef}>
      {/* Outer disc */}
      <mesh>
        <ringGeometry args={[0.35, 1.8, 64]} />
        <meshBasicMaterial color="#b8b8c8" side={THREE.DoubleSide} />
      </mesh>
      {/* Rainbow reflection bands */}
      {[0.5, 0.8, 1.1, 1.4, 1.65].map((r, i) => (
        <mesh key={i} position={[0, 0, 0.001]}>
          <ringGeometry args={[r, r + 0.08, 64]} />
          <meshBasicMaterial
            color={["#8888cc", "#aa88cc", "#88aacc", "#aacccc", "#ccaacc"][i]}
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      {/* Center hole */}
      <mesh position={[0, 0, 0.002]}>
        <circleGeometry args={[0.35, 32]} />
        <meshBasicMaterial color="#0a0a2e" side={THREE.DoubleSide} />
      </mesh>
      {/* Center ring */}
      <mesh position={[0, 0, 0.003]}>
        <ringGeometry args={[0.28, 0.35, 32]} />
        <meshBasicMaterial color="#999" side={THREE.DoubleSide} />
      </mesh>
      {/* Label area */}
      <mesh position={[0, 0, 0.004]}>
        <ringGeometry args={[0.6, 0.9, 64]} />
        <meshBasicMaterial color="#e0e0e8" transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SOUNDSCOPE — PS1 SoundScope visualization (8 distinct modes)
   0: Waveform Oscilloscope   1: Circular Orbit
   2: Spectrum Bars            3: Lissajous Figure
   4: Particle Fountain        5: Wireframe Sphere
   6: Star Burst               7: VU Meter
   ══════════════════════════════════════════════════════════════════ */
const SOUNDSCOPE_MODES = 8;

function SoundScopeVis({ mode }: { mode: number }) {
  const lineRef = useRef<THREE.Line>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  /* Geometries for each mode */
  const lineGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(128 * 3);
    for (let i = 0; i < 128; i++) {
      positions[i * 3] = (i / 127) * 4 - 2;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  const pointsGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(200 * 3);
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  const barGeos = useMemo(() => {
    return Array.from({ length: 24 }, () => new THREE.BoxGeometry(0.12, 1, 0.05));
  }, []);

  const sphereGeo = useMemo(() => {
    return new THREE.IcosahedronGeometry(1.2, 2);
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    /* Mode 0: Waveform Oscilloscope */
    if (mode === 0 && lineRef.current) {
      const pos = lineRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < 128; i++) {
        const x = pos[i * 3];
        pos[i * 3 + 1] = Math.sin(x * 3 + t * 5) * Math.cos(x * 1.5 + t * 3) * 0.6;
      }
      lineRef.current.geometry.attributes.position.needsUpdate = true;
    }

    /* Mode 1: Circular Orbit */
    if (mode === 1 && pointsRef.current) {
      const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < 64; i++) {
        const angle = (i / 64) * Math.PI * 2 + t * 0.5;
        const r = 0.8 + Math.sin(t * 4 + i * 0.5) * 0.3;
        pos[i * 3] = Math.cos(angle) * r;
        pos[i * 3 + 1] = Math.sin(angle) * r;
        pos[i * 3 + 2] = 0;
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }

    /* Mode 2: Spectrum Bars — animated via group children */
    if (mode === 2 && groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        const freq = Math.abs(Math.sin(i * 0.5 + t * 3) * Math.cos(i * 0.3 + t * 1.7));
        const h = 0.1 + freq * 1.8;
        child.scale.y = h;
        child.position.y = h / 2 - 0.9;
        const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        const hue = i / 24;
        mat.color.setHSL(hue, 0.8, 0.3 + freq * 0.4);
      });
    }

    /* Mode 3: Lissajous Figure */
    if (mode === 3 && lineRef.current) {
      const pos = lineRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < 128; i++) {
        const tt = (i / 128) * Math.PI * 2;
        pos[i * 3] = Math.sin(3 * tt + t * 0.8) * 1.5;
        pos[i * 3 + 1] = Math.sin(4 * tt + t * 0.5) * 1.2;
        pos[i * 3 + 2] = Math.sin(5 * tt + t * 0.3) * 0.3;
      }
      lineRef.current.geometry.attributes.position.needsUpdate = true;
    }

    /* Mode 4: Particle Fountain */
    if (mode === 4 && pointsRef.current) {
      const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < 200; i++) {
        const life = ((t * 2 + i * 0.1) % 3) / 3; // 0..1
        const angle = (i / 200) * Math.PI * 2 + Math.sin(i) * 2;
        const spread = life * 1.5;
        pos[i * 3] = Math.cos(angle) * spread * 0.5;
        pos[i * 3 + 1] = life * 2.5 - 1.2 - life * life * 2; // parabolic arc
        pos[i * 3 + 2] = Math.sin(angle) * spread * 0.5;
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }

    /* Mode 5: Wireframe Sphere — breathing */
    if (mode === 5 && meshRef.current) {
      const scale = 1 + Math.sin(t * 2) * 0.15;
      meshRef.current.scale.set(scale, scale, scale);
      meshRef.current.rotation.x = t * 0.3;
      meshRef.current.rotation.y = t * 0.5;
      const pos = meshRef.current.geometry.attributes.position.array as Float32Array;
      const orig = sphereGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < pos.length; i += 3) {
        const ox = orig[i],
          oy = orig[i + 1],
          oz = orig[i + 2];
        const dist = Math.sqrt(ox * ox + oy * oy + oz * oz);
        const wave = Math.sin(dist * 5 + t * 4) * 0.08;
        const factor = 1 + wave;
        pos[i] = ox * factor;
        pos[i + 1] = oy * factor;
        pos[i + 2] = oz * factor;
      }
      meshRef.current.geometry.attributes.position.needsUpdate = true;
    }

    /* Mode 6: Star Burst */
    if (mode === 6 && pointsRef.current) {
      const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < 200; i++) {
        const phi = (i / 200) * Math.PI * 2;
        const theta = Math.sin(i * 0.7) * Math.PI;
        const pulse = 0.5 + Math.sin(t * 3 + i * 0.2) * 0.5;
        const r = pulse * 2;
        pos[i * 3] = Math.sin(theta) * Math.cos(phi) * r;
        pos[i * 3 + 1] = Math.sin(theta) * Math.sin(phi) * r;
        pos[i * 3 + 2] = Math.cos(theta) * r;
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }

    /* Mode 7: VU Meter — dual needles */
    if (mode === 7 && groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        const level = 0.3 + Math.abs(Math.sin(t * 4 + i * 2.5)) * 0.6;
        child.scale.y = level;
        child.position.y = level / 2 - 0.8;
        const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        mat.color.setHSL(level > 0.7 ? 0 : 0.35, 0.9, 0.4 + level * 0.3);
      });
    }
  });

  /* ── Render based on mode ── */
  if (mode === 0 || mode === 3) {
    return (
      <primitive
        ref={lineRef}
        object={
          new THREE.Line(
            lineGeo,
            new THREE.LineBasicMaterial({ color: mode === 0 ? 0x44ff88 : 0x8844ff, linewidth: 2 }),
          )
        }
      />
    );
  }
  if (mode === 1 || mode === 4 || mode === 6) {
    return (
      <points ref={pointsRef} geometry={pointsGeo}>
        <pointsMaterial
          color={mode === 1 ? "#44ff88" : mode === 4 ? "#ff8844" : "#ffff44"}
          size={mode === 4 ? 0.04 : 0.06}
        />
      </points>
    );
  }
  if (mode === 2 || mode === 7) {
    const count = mode === 2 ? 24 : 12;
    return (
      <group ref={groupRef}>
        {Array.from({ length: count }, (_, i) => (
          <mesh
            key={i}
            position={[(i / count) * 4 - 2, 0, 0]}
            geometry={barGeos[i % barGeos.length]}
          >
            <meshBasicMaterial color="#44ff88" />
          </mesh>
        ))}
      </group>
    );
  }
  if (mode === 5) {
    return (
      <mesh ref={meshRef} geometry={sphereGeo.clone()}>
        <meshBasicMaterial color="#44ff88" wireframe />
      </mesh>
    );
  }
  return null;
}

/* ══════════════════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════════════════ */
function formatTime(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ══════════════════════════════════════════════════════════════════
   PS1 BIOS-style 3D beveled button
   ══════════════════════════════════════════════════════════════════ */
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

/* ══════════════════════════════════════════════════════════════════
   PS1 CD PLAYER — Authentic PS1 Fat BIOS CD Player UI
   ══════════════════════════════════════════════════════════════════ */
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
    error,
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
      {/* ══════ TOP BAR — PS1 style header ══════ */}
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
            onClick={() => {
              setShowSoundScope((v) => !v);
              setShowProgram(false);
            }}
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
            onClick={() => {
              setShowProgram((v) => !v);
              setShowSoundScope(false);
            }}
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

      {/* ══════ MAIN CONTENT AREA ══════ */}
      <div className="flex-1 flex flex-col items-center justify-center relative min-h-0">
        {/* CD Disc + SoundScope area */}
        {!showProgram && (
          <div className="flex-1 flex items-center justify-center w-full">
            {showSoundScope ? (
              <div
                className="w-[90%] max-w-100 aspect-square relative"
                onClick={() => setSoundScopeMode((m) => (m + 1) % SOUNDSCOPE_MODES)}
              >
                <div
                  className="absolute inset-0 rounded-sm"
                  style={{ border: "2px solid #1a1a4a", background: "#060618" }}
                >
                  <Canvas camera={{ position: [0, 0, 3], fov: 50 }} style={{ borderRadius: "2px" }}>
                    <color attach="background" args={["#060618"]} />
                    <SoundScopeVis mode={soundScopeMode} />
                  </Canvas>
                  <div
                    className="absolute bottom-2 right-3 text-[9px] uppercase tracking-widest"
                    style={{ color: "#335544" }}
                  >
                    SoundScope {soundScopeMode + 1}/{SOUNDSCOPE_MODES}
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-55 h-55 sm:w-70 sm:h-70">
                <Canvas camera={{ position: [0, 0, 3], fov: 45 }}>
                  <color attach="background" args={["#0a0a28"]} />
                  <ambientLight intensity={0.5} />
                  <SpinningDisc isPlaying={isPlaying} />
                </Canvas>
              </div>
            )}
          </div>
        )}

        {/* Program / Playlist panel */}
        {showProgram && (
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
                <div
                  className="text-xs text-center py-8 animate-pulse"
                  style={{ color: "#4444aa" }}
                >
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
        )}
      </div>

      {/* ══════ INFO BAR — Track info + time ══════ */}
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

      {/* ══════ TRANSPORT CONTROLS — PS1 BIOS style beveled buttons ══════ */}
      <div
        className="shrink-0 flex items-center justify-center gap-2 sm:gap-3 px-4 py-3 sm:py-4"
        style={{
          borderTop: "2px solid #1a1a4a",
          background: "linear-gradient(180deg, #121238 0%, #0a0a28 100%)",
        }}
      >
        <PS1Button onClick={() => pause()}>
          <span className="text-xs">■</span>
        </PS1Button>
        <PS1Button onClick={prev}>
          <span className="text-xs">|◄◄</span>
        </PS1Button>
        <PS1Button onClick={isPlaying ? pause : play} active={isPlaying}>
          <span className="text-sm">{isPlaying ? "❚❚" : "►"}</span>
        </PS1Button>
        <PS1Button onClick={next}>
          <span className="text-xs">►►|</span>
        </PS1Button>
        <PS1Button onClick={() => setRepeatMode((r) => (r + 1) % 3)} active={repeatMode > 0}>
          <span className="text-[10px]">
            {repeatMode === 0 ? "RPT" : repeatMode === 1 ? "ALL" : "1"}
          </span>
        </PS1Button>
        <PS1Button onClick={toggleShuffle} active={shuffle}>
          <span className="text-[10px]">SHFL</span>
        </PS1Button>
      </div>
    </div>
  );
}
