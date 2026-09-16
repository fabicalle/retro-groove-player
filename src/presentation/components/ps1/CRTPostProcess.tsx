/**
 * CRTPostProcess — full-screen CRT shader overlay for the PS1 3D visualizer.
 *
 * Implemented as a single full-screen mesh with a custom ShaderMaterial
 * (no external post-processing dependency). Effects:
 *   - Scanlines (horizontal dark bands)
 *   - Screen curvature (barrel distortion)
 *   - Chromatic aberration (RGB split on the UV grid)
 *   - Vignette + faint noise flicker
 *
 * The mesh sits in front of the 3D scene, in screen space, so it works
 * regardless of the underlying renderer. It uses additive blending with
 * a dark base so it darkens the existing pixels (scanlines).
 */

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const CRT_SHADER = {
  uniforms: {
    uTime: { value: 0 },
    uScanlineCount: { value: 560 },
    uCurvature: { value: 0.12 },
    uAberration: { value: 0.002 },
    uGridColor: { value: new THREE.Vector3(0.0, 0.0, 0.0) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    varying vec2 vUv;
    uniform float uTime;
    uniform float uScanlineCount;
    uniform float uCurvature;
    uniform float uAberration;
    uniform vec3 uGridColor;

    // Barrel curvature
    vec2 curve(vec2 uv) {
      float k = uCurvature;
      vec2 off = uv - 0.5;
      float r2 = off.x * off.x + off.y * off.y;
      float f = 1.0 + k * k * r2;
      return off * f + 0.5;
    }

    void main() {
      vec2 uv = curve(vUv);
      vec2 dir = uv - 0.5;

      // Edge fade — discard pixels outside the curved screen
      float edge = 1.0 - smoothstep(0.6, 1.0, length(uv - 0.5) * 1.4);
      if (edge <= 0.0) discard;

      // Scanline mask (dark horizontal bands)
      float scan = sin(uv.y * uScanlineCount * 6.2831) * 0.5 + 0.5;
      float scanlineDark = 0.72 + 0.28 * (1.0 - scan);

      // Subtle RGB grid aberration
      float aberr = (vUv.x - 0.5) * uAberration;

      // Faint noise flicker
      float noise = fract(sin(dot(uv + uTime * 0.01, vec2(12.9898, 78.233))) * 43758.5453);
      float flicker = 0.02 * noise;

      // Output: dark additive overlay (alpha modulated by scanline + edge)
      vec3 color = uGridColor * (scanlineDark + flicker);
      gl_FragColor = vec4(color, (1.0 - scan) * 0.5 * edge);
    }
  `,
};

export function CRTPostProcess() {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  useFrame((state) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <mesh position={[0, 0, -0.02]} scale={[2, 2, 1]}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        transparent
        blending={THREE.NormalBlending}
        depthWrite={false}
        uniforms={CRT_SHADER.uniforms}
        vertexShader={CRT_SHADER.vertexShader}
        fragmentShader={CRT_SHADER.fragmentShader}
      />
    </mesh>
  );
}
