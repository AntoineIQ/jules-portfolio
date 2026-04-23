"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import { SeasonMatrixFallback } from "@/components/f1/season-matrix-fallback";
import { circuitCode, type SeasonCell, type SeasonPayload } from "@/lib/f1-types";

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function colorForProbability(p: number) {
  const low = { r: 238, g: 230, b: 221 };
  const high = { r: 199, g: 54, b: 44 };
  const mid = { r: 152, g: 142, b: 136 };
  const tint = p < 0.5 ? p * 2 : (p - 0.5) * 2;
  const from = p < 0.5 ? low : mid;
  const to = p < 0.5 ? mid : high;
  return `rgb(${Math.round(lerp(from.r, to.r, tint))}, ${Math.round(lerp(from.g, to.g, tint))}, ${Math.round(
    lerp(from.b, to.b, tint),
  )})`;
}

type LandscapeNode = {
  cell: SeasonCell;
  x: number;
  y: number;
  z: number;
  height: number;
};

function LandscapeBoxes({
  nodes,
  onHover,
  onSelect,
}: {
  nodes: LandscapeNode[];
  onHover: (node: LandscapeNode | null) => void;
  onSelect: (node: LandscapeNode) => void;
}) {
  return (
    <>
      {nodes.map((node) => (
        <group key={`${node.cell.driver}-${node.cell.round}`}>
          <mesh
            position={[node.x, node.y, node.z]}
            onPointerEnter={(event) => {
              event.stopPropagation();
              onHover(node);
            }}
            onPointerLeave={() => onHover(null)}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(node);
            }}
          >
            <boxGeometry args={[0.72, 0.72, node.height]} />
            <meshStandardMaterial
              color={colorForProbability(node.cell.p)}
              roughness={0.28}
              metalness={0.08}
            />
          </mesh>
          {node.cell.actual === 1 ? (
            <mesh position={[node.x, node.y, node.z + node.height / 2 + 0.1]}>
              <sphereGeometry args={[0.1, 14, 14]} />
              <meshStandardMaterial color="#7fe3b9" emissive="#7fe3b9" emissiveIntensity={0.25} />
            </mesh>
          ) : null}
        </group>
      ))}
    </>
  );
}

export function SeasonLandscapeClient({
  data,
  target,
}: {
  data: SeasonPayload;
  target: string;
}) {
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const [hovered, setHovered] = useState<LandscapeNode | null>(null);

  const nodes = useMemo(() => {
    const raceOffsets = data.races.map(
      (_, index) => index * 1.05 - ((data.races.length - 1) * 1.05) / 2,
    );
    const driverOffsets = data.drivers.map(
      (_, index) => ((data.drivers.length - 1) * 0.84) / 2 - index * 0.84,
    );
    const byKey = new Map(data.cells.map((cell) => [`${cell.driver}|${cell.round}`, cell]));

    return data.drivers.flatMap((driver, driverIndex) =>
      data.races.flatMap((race, raceIndex) => {
        const cell = byKey.get(`${driver.driver}|${race.round}`);
        if (!cell) return [];
        const height = 0.18 + cell.p * 3.9;
        return [
          {
            cell,
            x: raceOffsets[raceIndex],
            y: driverOffsets[driverIndex],
            z: height / 2,
            height,
          },
        ];
      }),
    );
  }, [data]);

  const highlights = useMemo(() => {
    const keyed = new Map(nodes.map((node) => [`${node.cell.driver}|${node.cell.round}`, node]));
    return data.highlights
      .map((highlight) => keyed.get(`${highlight.driver}|${highlight.round}`))
      .filter((item): item is LandscapeNode => Boolean(item))
      .slice(0, 5);
  }, [data.highlights, nodes]);

  if (reduceMotion) {
    return <SeasonMatrixFallback data={data} target={target} />;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="relative overflow-hidden rounded-[28px] border-[2.5px] border-ink bg-[#f4eee4]">
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b border-ink/10 bg-[#f4eee4]/90 px-4 py-3 backdrop-blur-sm">
          <div>
            <p className="eyebrow text-ink/50">3D season landscape</p>
            <p className="text-[13px] text-ink/70">
              X = race order · Y = drivers · Z = predicted probability
            </p>
          </div>
          <span className="rounded-full border border-ink/20 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
            drag to orbit
          </span>
        </div>

        <div className="aspect-[16/10] pt-10">
          <Canvas camera={{ position: [0, -18, 11], fov: 42 }}>
            <color attach="background" args={["#f4eee4"]} />
            <ambientLight intensity={1.15} />
            <directionalLight position={[-8, -10, 12]} intensity={1.8} />
            <directionalLight position={[6, 8, 5]} intensity={0.35} />
            <gridHelper args={[32, 24, "#d8cec3", "#e7ddd1"]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.02]} />

            <LandscapeBoxes
              nodes={nodes}
              onHover={setHovered}
              onSelect={(node) =>
                router.push(`/projects/f1/race/${data.season}/${node.cell.round}?target=${target}`)
              }
            />

            {highlights.map((node) => (
              <Line
                key={`line-${node.cell.driver}-${node.cell.round}`}
                points={[
                  [node.x, node.y, 0],
                  [node.x, node.y, node.height + 0.4],
                ]}
                color="#d93e2b"
                lineWidth={1.2}
              />
            ))}

            <OrbitControls
              autoRotate
              autoRotateSpeed={0.45}
              enablePan={false}
              minDistance={12}
              maxDistance={28}
              minPolarAngle={Math.PI / 3.4}
              maxPolarAngle={Math.PI / 1.9}
            />
          </Canvas>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <div className="rounded-[24px] border-[2.5px] border-ink bg-white-warm p-5">
          <p className="eyebrow text-ink/55">Hover state</p>
          {hovered ? (
            <div className="mt-3 space-y-3">
              <div>
                <h3 className="font-display text-[32px] uppercase tracking-tightest">
                  {hovered.cell.driver}
                </h3>
                <p className="text-[14px] text-ink/65">{hovered.cell.team}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <div>
                  <p className="eyebrow text-ink/45">race</p>
                  <p>{circuitCode(data.races.find((race) => race.round === hovered.cell.round)?.event_name ?? "", hovered.cell.round)}</p>
                </div>
                <div>
                  <p className="eyebrow text-ink/45">predicted</p>
                  <p>{(hovered.cell.p * 100).toFixed(0)}%</p>
                </div>
                <div>
                  <p className="eyebrow text-ink/45">grid</p>
                  <p>{hovered.cell.grid_position ?? "—"}</p>
                </div>
                <div>
                  <p className="eyebrow text-ink/45">finish</p>
                  <p>{hovered.cell.finish_position ?? "—"}</p>
                </div>
              </div>
              <p className="text-[13px] leading-relaxed text-ink/70">
                Mint cap marks a positive outcome. Red guide wires call out the season’s biggest misses.
              </p>
            </div>
          ) : (
            <p className="mt-3 text-[14px] leading-relaxed text-ink/65">
              Hover any peak to inspect a driver-race prediction, then click through to the full race dossier.
            </p>
          )}
        </div>

        <div className="rounded-[24px] border-[2.5px] border-ink bg-[#efe6d8] p-5">
          <p className="eyebrow text-ink/55">Season highlights</p>
          <div className="mt-4 space-y-3">
            {data.highlights.slice(0, 4).map((item) => (
              <button
                key={`${item.driver}-${item.round}`}
                type="button"
                className="flex w-full items-center justify-between gap-4 rounded-[16px] border border-ink/15 bg-white/70 px-4 py-3 text-left transition-transform hover:-translate-y-[1px]"
                onClick={() => router.push(`/projects/f1/race/${data.season}/${item.round}?target=${target}`)}
              >
                <div>
                  <p className="font-semibold">{item.driver}</p>
                  <p className="text-[12px] text-ink/60">
                    {item.event_name} · surprise {item.surprise.toFixed(2)}
                  </p>
                </div>
                <div className="text-right text-[12px]">
                  <p>{(item.p * 100).toFixed(0)}%</p>
                  <p className="text-ink/55">{item.actual ? "scored" : "missed"}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
