"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { ARCHETYPE_LABELS } from "@/lib/labels";
import { NIGHT_TIER_COLORS, skyCounts, type Sky } from "@/lib/sky";
import { cn } from "@/lib/utils";

const VERTEX = /* glsl */ `
attribute float aSize;
attribute vec3 aColor;
uniform float uPixelRatio;
varying vec3 vColor;
void main() {
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio * (9.0 / -mv.z);
}`;

const FRAGMENT = /* glsl */ `
uniform float uOpacity;
varying vec3 vColor;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float glow = pow(smoothstep(0.5, 0.0, d), 1.5);
  vec3 col = mix(vColor, vec3(1.0), smoothstep(0.12, 0.0, d) * 0.45);
  gl_FragColor = vec4(col, glow * uOpacity);
}`;

// Star size per tier (Rendah to Kritis); probability adds a little on top, so risk reads as magnitude.
const TIER_SIZE = [2.6, 4.6, 6.2, 8.2];
const FOV = 40;

type Cluster = { key: string; n: number; flagged: number; center: THREE.Vector3; radius: number; below: boolean };

// Constellations per row follow the canvas: one row on a wide strip, three across on a panel, two on a phone.
const ROWS: Record<number, number[][]> = { 6: [[0, 1, 2, 3, 4, 5]], 3: [[0, 1, 2], [3, 4, 5]], 2: [[0, 1], [2, 3], [4, 5]] };
const ROW_Y: Record<number, number[]> = { 1: [0], 2: [2.05, -2.25], 3: [4.1, 0, -4.3] };

function layout(sky: Sky, perRow: number): Cluster[] {
  const counts = skyCounts(sky);
  const radius = counts.map((c) => 0.17 * Math.cbrt(Math.max(c.n, 1)));
  const GAP = 0.8;
  const rows = ROWS[perRow];
  const out: Cluster[] = [];
  rows.forEach((row, r) => {
    const width = row.reduce((s, i) => s + 2 * radius[i], 0) + GAP * (row.length - 1);
    let x = -width / 2;
    const y = ROW_Y[rows.length][r];
    row.forEach((i, j) => {
      x += radius[i];
      // A gentle wave keeps a single row from reading as a bar chart.
      const wave = rows.length === 1 ? (j % 2 ? -0.35 : 0.35) : 0;
      out[i] = { ...counts[i], center: new THREE.Vector3(x, y + wave, 0), radius: radius[i], below: rows.length === 1 ? j % 2 === 1 : r === rows.length - 1 };
      x += radius[i] + GAP;
    });
  });
  return out;
}

/** Keeps every constellation and its label inside the frame at any canvas aspect. */
function FitCamera({ clusters }: { clusters: Cluster[] }) {
  const { camera, size } = useThree();
  useEffect(() => {
    let halfW = 0;
    let halfH = 0;
    for (const c of clusters) {
      halfW = Math.max(halfW, Math.abs(c.center.x) + c.radius + 0.4);
      halfH = Math.max(halfH, Math.abs(c.center.y) + c.radius + 1.05);
    }
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const aspect = size.width / Math.max(size.height, 1);
    const dist = Math.max(halfW / (tan * aspect), halfH / tan) * 0.98;
    camera.position.set(0, 0.4, dist);
    camera.lookAt(0, 0, 0);
  }, [camera, size, clusters]);
  return null;
}

function ClusterPoints({ sky, cluster, index, dim, spin }: { sky: Sky; cluster: Cluster; index: number; dim: boolean; spin: boolean }) {
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const lineMaterial = useRef<THREE.LineBasicMaterial>(null);
  const dpr = useThree((s) => s.viewport.dpr);
  const { geometry, line } = useMemo(() => {
    const idx: number[] = [];
    for (let k = 0; k < sky.a.length; k++) if (sky.a[k] === index) idx.push(k);
    const pos = new Float32Array(idx.length * 3);
    const col = new Float32Array(idx.length * 3);
    const size = new Float32Array(idx.length);
    const colors = NIGHT_TIER_COLORS.map((c) => new THREE.Color(c));
    let seed = 1013 + index * 7919;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const stars: { x: number; y: number; z: number; p: number }[] = [];
    idx.forEach((k, j) => {
      const p = sky.p[k] / 1000;
      // Higher risk sits nearer the core, so each constellation glows warm from the inside.
      const r = cluster.radius * (0.25 + 0.75 * Math.cbrt(rnd()) * (1 - 0.55 * p));
      const th = rnd() * Math.PI * 2;
      const ph = Math.acos(2 * rnd() - 1);
      const x = r * Math.sin(ph) * Math.cos(th);
      const y = r * Math.cos(ph) * 0.92;
      const z = r * Math.sin(ph) * Math.sin(th);
      pos.set([x, y, z], j * 3);
      const c = colors[sky.t[k]];
      // Rendah stars stay dimmer so the warm ones carry the plate.
      const lum = sky.t[k] === 0 ? 0.62 : 1;
      col.set([c.r * lum, c.g * lum, c.b * lum], j * 3);
      size[j] = TIER_SIZE[sky.t[k]] + p * 1.6;
      stars.push({ x, y, z, p });
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    // The constellation figure: the six riskiest stars, joined in order around the cluster's axis.
    const top = [...stars]
      .sort((a, b) => b.p - a.p)
      .slice(0, 6)
      .sort((a, b) => Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x));
    const l = new THREE.BufferGeometry().setFromPoints(top.map((v) => new THREE.Vector3(v.x, v.y, v.z)));
    return { geometry: g, line: l };
  }, [sky, cluster.radius, index]);
  useEffect(
    () => () => {
      geometry.dispose();
      line.dispose();
    },
    [geometry, line],
  );

  const uniforms = useMemo(() => ({ uOpacity: { value: 1 }, uPixelRatio: { value: dpr } }), [dpr]);
  useFrame((_, dt) => {
    const u = material.current?.uniforms.uOpacity;
    if (u) u.value += ((dim ? 0.22 : 1) - u.value) * Math.min(1, dt * 8);
    if (lineMaterial.current) lineMaterial.current.opacity = 0.42 * (u ? u.value : 1);
    // Each constellation turns on its own axis, slowly, like the sky over a night.
    if (spin && group.current) group.current.rotation.y += dt * (0.12 + index * 0.012);
  });

  return (
    <group ref={group} position={cluster.center} rotation={[0.2, index * 0.9, 0]}>
      <points geometry={geometry}>
        <shaderMaterial
          ref={material}
          vertexShader={VERTEX}
          fragmentShader={FRAGMENT}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <lineLoop geometry={line}>
        <lineBasicMaterial ref={lineMaterial} color={NIGHT_TIER_COLORS[1]} transparent opacity={0.42} depthWrite={false} />
      </lineLoop>
    </group>
  );
}

/** Faint right ascension and declination rings with rim ticks: the atlas plate the stars are charted on. */
function SkyGrid({ clusters }: { clusters: Cluster[] }) {
  const geometry = useMemo(() => {
    let w = 0;
    let h = 0;
    for (const c of clusters) {
      w = Math.max(w, Math.abs(c.center.x) + c.radius);
      h = Math.max(h, Math.abs(c.center.y) + c.radius);
    }
    const pts: THREE.Vector3[] = [];
    const Z = -1.2;
    const ring = (rx: number, ry: number) => {
      for (let i = 0; i < 96; i++) {
        const a0 = (i / 96) * Math.PI * 2;
        const a1 = ((i + 1) / 96) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a0) * rx, Math.sin(a0) * ry, Z), new THREE.Vector3(Math.cos(a1) * rx, Math.sin(a1) * ry, Z));
      }
    };
    [0.45, 0.75, 1.05].forEach((f) => ring(w * f * 1.1, h * f * 1.15));
    // Hour lines through the centre, and rim ticks every 15 degrees on the outer ring.
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI;
      pts.push(new THREE.Vector3(Math.cos(a) * w * 1.16, Math.sin(a) * h * 1.2, Z), new THREE.Vector3(-Math.cos(a) * w * 1.16, -Math.sin(a) * h * 1.2, Z));
    }
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const rx = w * 1.155;
      const ry = h * 1.2075;
      pts.push(new THREE.Vector3(Math.cos(a) * rx, Math.sin(a) * ry, Z), new THREE.Vector3(Math.cos(a) * rx * 1.04, Math.sin(a) * ry * 1.04, Z));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [clusters]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#a9b8d9" transparent opacity={0.09} depthWrite={false} />
    </lineSegments>
  );
}

/** Projects each label anchor to the canvas every frame and moves the plain DOM label there (no nested React roots). */
function LabelTracker({ clusters, labels }: { clusters: Cluster[]; labels: React.RefObject<(HTMLElement | null)[]> }) {
  const { camera, size, scene } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    scene.updateMatrixWorld();
    clusters.forEach((c, i) => {
      const el = labels.current?.[i];
      if (!el) return;
      v.set(c.center.x, c.center.y + (c.radius + 0.38) * (c.below ? -1 : 1), 0);
      const group = scene.getObjectByName("sky-root");
      if (group) v.applyMatrix4(group.matrixWorld);
      v.project(camera);
      // Keep the whole label inside the canvas, even for the outermost constellations.
      const half = el.offsetWidth / 2 + 8;
      const x = Math.min(size.width - half, Math.max(half, ((v.x + 1) / 2) * size.width));
      const h = el.offsetHeight + 8;
      const y = c.below
        ? Math.min(size.height - h, ((1 - v.y) / 2) * size.height)
        : Math.max(h, ((1 - v.y) / 2) * size.height);
      el.style.transform = `translate(-50%, ${c.below ? "0" : "-100%"}) translate(${x}px, ${y}px)`;
      el.style.opacity = "1";
    });
  });
  return null;
}

/** The sky leans toward the pointer: one depth clock with the page's parallax layers. */
function PointerDrift({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const pointer = useThree((s) => s.pointer);
  useFrame(() => {
    const g = group.current;
    if (!g || !enabled) return;
    g.rotation.y += (pointer.x * 0.18 - g.rotation.y) * 0.04;
    g.rotation.x += (0.12 - pointer.y * 0.08 - g.rotation.x) * 0.04;
  });
  return (
    <group ref={group} name="sky-root" rotation={[0.12, 0, 0]}>
      {children}
    </group>
  );
}

export type ConstellationProps = {
  sky: Sky;
  wide?: boolean;
  /** Called with an archetype key when its label is pressed; labels are plain text without it. */
  onCluster?: (archetype: string) => void;
  drift?: boolean;
  className?: string;
};

/** The cohort as a sky: one star per student, grouped by archetype, warmer and larger with risk. */
export default function Constellation({ sky, wide = true, onCluster, drift = false, className }: ConstellationProps) {
  const [reduce] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  const host = useRef<HTMLDivElement>(null);
  const [perRow, setPerRow] = useState(wide ? 6 : 3);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const aspect = e.contentRect.width / Math.max(e.contentRect.height, 1);
      setPerRow(aspect >= 2.2 && wide ? 6 : aspect >= 1.05 ? 3 : 2);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [wide]);
  const clusters = useMemo(() => layout(sky, perRow), [sky, perRow]);
  const [hovered, setHovered] = useState<string | null>(null);
  const labels = useRef<(HTMLElement | null)[]>([]);

  return (
    <div ref={host} className={cn("relative h-full w-full overflow-hidden", className)}>
      <Canvas dpr={[1, 2]} camera={{ fov: FOV, position: [0, 0.4, 12] }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} aria-hidden>
        <FitCamera clusters={clusters} />
        <PointerDrift enabled={drift && !reduce}>
          <SkyGrid clusters={clusters} />
          {clusters.map((c, i) => (
            <ClusterPoints key={c.key} sky={sky} cluster={c} index={i} dim={hovered !== null && hovered !== c.key} spin={!reduce} />
          ))}
        </PointerDrift>
        <LabelTracker clusters={clusters} labels={labels} />
        {/* Drag tilts the sky a little; zoom and pan stay off so the page scrolls normally. */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          rotateSpeed={0.4}
          minAzimuthAngle={-0.45}
          maxAzimuthAngle={0.45}
          minPolarAngle={Math.PI * 0.4}
          maxPolarAngle={Math.PI * 0.6}
        />
      </Canvas>
      {clusters.map((c, i) => {
        // On a phone (two per row) labels carry the name only; the archetype table below holds the counts.
        const compact = perRow === 2;
        const text = (
          <>
            {/* On a phone the tag stacks above the name, so two labels in one row stay narrow enough not to meet. */}
            <span className={cn("font-semibold text-night-ink", compact ? "flex flex-col text-[11px] leading-tight" : "flex items-baseline gap-1.5 text-[13px]")}>
              <span className="font-mono text-[10px] font-medium tracking-wide text-starlight">K{String(i + 1).padStart(2, "0")}</span>
              {ARCHETYPE_LABELS[c.key] ?? c.key}
            </span>
            {!compact && (
              <span className="block font-mono text-[11px] text-night-muted tabular-nums">
                {c.flagged.toLocaleString("id-ID")}/{c.n.toLocaleString("id-ID")} ter-flag
              </span>
            )}
          </>
        );
        const common = "absolute top-0 left-0 w-max opacity-0 transition-opacity duration-500";
        return onCluster ? (
          <button
            key={c.key}
            ref={(el) => {
              labels.current[i] = el;
            }}
            type="button"
            onClick={() => onCluster(c.key)}
            onPointerEnter={() => setHovered(c.key)}
            onPointerLeave={() => setHovered(null)}
            onFocus={() => setHovered(c.key)}
            onBlur={() => setHovered(null)}
            className={cn(common, "glass-night rounded-2xl text-left", compact ? "px-2.5 py-1" : "px-3 py-1.5")}
            aria-label={`Buka daftar prioritas ${ARCHETYPE_LABELS[c.key]}: ${c.flagged} dari ${c.n} mahasiswa ter-flag`}
          >
            {text}
          </button>
        ) : (
          <span
            key={c.key}
            ref={(el) => {
              labels.current[i] = el;
            }}
            className={cn(common, "pointer-events-none px-1 text-left [text-shadow:0_1px_8px_rgb(8_22_52/0.9)]")}
          >
            {text}
          </span>
        );
      })}
    </div>
  );
}
