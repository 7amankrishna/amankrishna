"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useTheme } from "next-themes";
import * as THREE from "three";

/**
 * Neural-constellation particle field.
 * ~2500 points on a slowly-rotating sphere shell; the whole group
 * parallaxes toward the pointer. Kept deliberately cheap: one draw
 * call, no post-processing, DPR capped at 1.5.
 */
function Particles({ light }: { light: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const mouse = useRef({ x: 0, y: 0 });

  const { positions, colors } = useMemo(() => {
    const count = 2500;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    // Light mode needs darker, saturated particles with normal blending;
    // dark mode gets bright ones composited additively.
    const palette = light
      ? [new THREE.Color("#5b34e8"), new THREE.Color("#0e7490"), new THREE.Color("#1d54d0")]
      : [new THREE.Color("#7c5cff"), new THREE.Color("#22d3ee"), new THREE.Color("#4d7cfe")];
    for (let i = 0; i < count; i++) {
      // fibonacci-ish sphere shell with jitter for organic depth
      const r = 2.2 + Math.random() * 1.6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      const c = palette[i % 3];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return { positions: pos, colors: col };
  }, [light]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    mouse.current.x = state.pointer.x;
    mouse.current.y = state.pointer.y;
    ref.current.rotation.y += delta * 0.05;
    ref.current.rotation.x = THREE.MathUtils.lerp(
      ref.current.rotation.x,
      mouse.current.y * 0.25,
      0.04,
    );
    ref.current.rotation.z = THREE.MathUtils.lerp(
      ref.current.rotation.z,
      mouse.current.x * 0.15,
      0.04,
    );
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={light ? 0.025 : 0.02}
        vertexColors
        transparent
        opacity={light ? 0.9 : 0.8}
        sizeAttenuation
        depthWrite={false}
        blending={light ? THREE.NormalBlending : THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function HeroScene() {
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const { resolvedTheme } = useTheme();
  const light = resolvedTheme === "light";

  // Pause the WebGL loop entirely once the hero scrolls out of view.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      threshold: 0.05,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 60 }}
        dpr={[1, 1.5]}
        frameloop={visible ? "always" : "never"}
        gl={{ antialias: false, powerPreference: "high-performance" }}
      >
        <Particles light={light} />
      </Canvas>
    </div>
  );
}
