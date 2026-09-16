/**
 * PS1Wireframe — React Three Fiber scene that recreates the PS1 FAT
 * CD Player SoundScope visualizer.
 *
 * Modes (cycled with Select / Square):
 *   - "tunnel"  : inward wireframe tunnel
 *   - "wave"    : planar 3D wave mesh
 *   - "sphere"  : wireframe icosahedron
 *
 * Reactivity:
 *   - Bass kick → camera + object scale pulse
 *   - Treble   → vertex jitter (PS1 GPU imprecision)
 *   - Energy   → rotation speed
 *
 * The scene reads the spectrum imperatively from `useAudioStore`
 * inside `useFrame`, so there are NO React re-renders per frame.
 */

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useAudioStore } from "@/store/useAudioStore";
import { CRTPostProcess } from "./CRTPostProcess";

const PS1_PALETTE = {
  cyan: 0x44ffff,
  blue: 0x3366ff,
  magenta: 0xff33aa,
  violet: 0xaa33ff,
};

interface Props {
  mode?: "tunnel" | "wave" | "sphere";
}

export function PS1Wireframe({ mode = "tunnel" }: Props) {
  return (
    <>
      <color attach="background" args={["#060618"]} />
      <PS1Scene mode={mode} />
      <CRTPostProcess />
    </>
  );
}

function PS1Scene({ mode }: { mode: "tunnel" | "wave" | "sphere" }) {
  const groupRef = useRef<THREE.Group>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  // Geometries — created once
  const waveGeo = useMemo(() => new THREE.PlaneGeometry(4, 4, 32, 32), []);
  const sphereGeo = useMemo(() => new THREE.IcosahedronGeometry(1.5, 2), []);

  const lastTimeRef = useRef<number>(0);

  useFrame((state) => {
    const frame = useAudioStore.getState().frame;
    const bass = frame?.bass ?? 0;
    const treble = frame?.treble ?? 0;
    const energy = frame?.energy ?? 0;
    const beat = frame?.beat ?? 0;

    if (!groupRef.current) return;

    // Delta time in seconds (R3F clock is seconds)
    const now = state.clock.elapsedTime;
    const delta = Math.max(0.0001, now - lastTimeRef.current);
    lastTimeRef.current = now;

    // Bass kick → scale pulse
    const pulse = 1 + beat * 0.25;
    groupRef.current.scale.setScalar(pulse);

    // Rotation speed based on energy
    const rotSpeed = 0.2 + energy * 1.5;
    groupRef.current.rotation.x += delta * rotSpeed * 0.3;
    groupRef.current.rotation.y += delta * rotSpeed;

    // Camera zoom on bass
    if (cameraRef.current) {
      const targetFov = 50 - bass * 12;
      cameraRef.current.fov = THREE.MathUtils.lerp(cameraRef.current.fov, targetFov, delta * 4);
      cameraRef.current.updateProjectionMatrix();
    }

    // Vertex jitter (PS1 GPU imprecision) — driven by treble
    applyJitter(groupRef.current, treble);
  });

  function applyJitter(group: THREE.Group, treble: number) {
    const jitterAmp = treble * 0.08;
    group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.geometry || !mesh.geometry.attributes.position) return;
      const pos = mesh.geometry.attributes.position;
      const orig = mesh.geometry.getAttribute("original");
      if (!orig) {
        // Store original on first run
        const o = new THREE.BufferAttribute(pos.array.slice(), pos.itemSize);
        mesh.geometry.setAttribute("original", o);
      }
      const src = (orig ?? pos).array;
      const arr = pos.array;
      for (let i = 0; i < arr.length; i++) {
        const jitter = (Math.random() - 0.5) * jitterAmp;
        arr[i] = src[i] + jitter;
      }
      pos.needsUpdate = true;
    });
  }

  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: PS1_PALETTE.cyan,
        wireframe: true,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      }),
    [],
  );

  if (mode === "sphere") {
    return (
      <group ref={groupRef}>
        <mesh geometry={sphereGeo} material={material} />
      </group>
    );
  }

  if (mode === "wave") {
    return (
      <group ref={groupRef}>
        <mesh geometry={waveGeo} material={material} position={[0, 0, -1]} />
      </group>
    );
  }

  // Tunnel mode: nested rings receding into the distance
  return (
    <group ref={groupRef}>
      {Array.from({ length: 16 }).map((_, i) => {
        const z = -i * 0.6;
        const scale = 1 + i * 0.18;
        return (
          <mesh key={i} position={[0, 0, z]} scale={[scale, scale, 1]}>
            <ringGeometry args={[1.8, 2.0, 32]} />
            <meshBasicMaterial
              color={
                [PS1_PALETTE.cyan, PS1_PALETTE.blue, PS1_PALETTE.violet, PS1_PALETTE.magenta][i % 4]
              }
              wireframe
              transparent
              opacity={0.9 - i * 0.04}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
}
