"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionTemplate,
  useMotionValueEvent,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";
import { ArrowDiagonal } from "@/components/decoration/arrow";
import { KineticText } from "@/components/motion/kinetic-text";

type Project = {
  n: string;
  status: "Case study" | "In progress" | "Reserved";
  year: string;
  title: string[];
  description: string;
  tags: string[];
  href?: string;
  tone: "cobalt" | "pink" | "yellow";
};

const PROJECTS: Project[] = [
  {
    n: "01",
    status: "Case study",
    year: "2026",
    title: ["F1 prediction", "lab,", "live."],
    description:
      "A recruiter-facing ML case study with a live Python inference API, a 3D season explorer, and historical evaluation that stays honest about misses.",
    tags: ["LightGBM", "Calibration", "Next.js", "FastAPI", "Railway"],
    href: "/projects/f1",
    tone: "cobalt",
  },
  {
    n: "02",
    status: "In progress",
    year: "2026",
    title: ["Eval harness", "for coding", "agents."],
    description:
      "A lightweight, reproducible harness for stress-testing AI coding assistants on real tasks — because vibes-based benchmarks aren't benchmarks.",
    tags: ["Evals", "TypeScript", "Tooling"],
    tone: "pink",
  },
  {
    n: "03",
    status: "Reserved",
    year: "—",
    title: ["Reserved", "for the", "next case."],
    description:
      "Space kept for the next serious piece. I'd rather have three case studies worth reading than ten projects worth skimming.",
    tags: [],
    tone: "yellow",
  },
];

const TONE_MAP: Record<
  Project["tone"],
  { bg: string; fg: string; accent: string; chipBg: string; chipBorder: string; tagBg: string; tagBorder: string; tagText: string; dot: string; cta: string }
> = {
  cobalt: {
    bg: "bg-cobalt",
    fg: "text-cream",
    accent: "text-yellow",
    chipBg: "bg-cobalt-deep",
    chipBorder: "border-cream text-cream",
    tagBg: "bg-cobalt-deep",
    tagBorder: "border-cream",
    tagText: "text-cream",
    dot: "bg-yellow",
    cta: "bg-yellow text-ink",
  },
  pink: {
    bg: "bg-pink",
    fg: "text-ink",
    accent: "text-cream",
    chipBg: "bg-cream",
    chipBorder: "border-ink text-ink",
    tagBg: "bg-cream",
    tagBorder: "border-ink",
    tagText: "text-ink",
    dot: "bg-ink",
    cta: "bg-ink text-cream",
  },
  yellow: {
    bg: "bg-cream",
    fg: "text-ink",
    accent: "text-pink",
    chipBg: "bg-cream-deep",
    chipBorder: "border-ink text-ink",
    tagBg: "bg-cream-deep",
    tagBorder: "border-ink",
    tagText: "text-ink",
    dot: "bg-pink",
    cta: "bg-ink text-cream",
  },
};

export function HorizontalWork() {
  const reduce = useReducedMotion();
  if (reduce) return <FallbackStack />;
  return (
    <>
      <div className="lg:hidden">
        <FallbackStack />
      </div>
      <div className="hidden lg:block">
        <HorizontalTrack />
      </div>
    </>
  );
}

function HorizontalTrack() {
  const sectionRef = useRef<HTMLElement>(null);
  const [progressLabel, setProgressLabel] = useState("01 / 03");

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const rawX = useTransform(scrollYProgress, [0, 1], [0, -66.6667]);
  const smoothX = useSpring(rawX, { stiffness: 70, damping: 20, mass: 0.35 });
  const trackTransform = useMotionTemplate`translate3d(${smoothX}%, 0px, 0px)`;

  const progressScale = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.3 });
  const progressTransform = useMotionTemplate`scaleX(${progressScale})`;

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const n = Math.max(1, Math.min(PROJECTS.length, Math.floor(v * PROJECTS.length) + 1));
    setProgressLabel(`0${n} / 0${PROJECTS.length}`);
  });

  return (
    <>
      {/* Intro — scrolls past naturally before the pin starts, so it never overlaps a card */}
      <div className="bg-cream text-ink px-6 md:px-10 pt-20 pb-16 md:pt-24 md:pb-20">
        <div className="mx-auto max-w-wide flex items-end justify-between gap-6 flex-wrap">
          <div>
            <span className="eyebrow text-ink/60">§ 01 · Featured work</span>
            <h2 className="mt-4 font-display uppercase text-hero-md">
              Three projects,
              <span className="block">scroll to meet them.</span>
            </h2>
          </div>
          <Link
            href="/projects"
            className="group inline-flex items-center gap-3 rounded-md border-2 border-ink px-6 py-3 press-scale"
          >
            <span className="eyebrow">All projects</span>
            <ArrowDiagonal className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <section
        ref={sectionRef}
        className="relative bg-cream text-ink"
        style={{ height: "320vh" }}
      >
      <div className="sticky top-0 h-screen overflow-hidden">
        <motion.div
          className="flex h-full"
          initial={false}
          style={{
            transform: trackTransform,
            width: `${PROJECTS.length * 100}vw`,
            willChange: "transform",
          }}
        >
          {PROJECTS.map((p, i) => (
            <Card key={p.n} project={p} index={i} scrollYProgress={scrollYProgress} />
          ))}
        </motion.div>

        <div className="pointer-events-none absolute bottom-6 md:bottom-10 left-0 right-0 px-6 md:px-10">
          <div className="mx-auto max-w-wide flex items-center justify-between gap-6">
            <span className="eyebrow text-ink/70 bg-cream/85 backdrop-blur px-3 py-1.5 rounded-full border-2 border-ink/20">
              Scroll to advance →
            </span>
            <span className="eyebrow text-ink font-semibold bg-cream/85 backdrop-blur px-3 py-1.5 rounded-full border-2 border-ink">
              {progressLabel}
            </span>
            <div className="h-[3px] w-28 md:w-52 bg-ink/15 overflow-hidden rounded-full">
              <motion.div
                className="h-full w-full origin-left bg-ink"
                initial={false}
                style={{ transform: progressTransform }}
              />
            </div>
          </div>
        </div>
      </div>
      </section>
    </>
  );
}

function Card({
  project,
  index,
  scrollYProgress,
}: {
  project: Project;
  index: number;
  scrollYProgress: MotionValue<number>;
}) {
  const tone = TONE_MAP[project.tone];
  const total = PROJECTS.length;
  const center = (index + 0.5) / total;
  const window = 0.5 / total;

  // Subtle parallax on visual column only — no opacity fade (keeps cards crisp)
  const visualY = useTransform(
    scrollYProgress,
    [center - window, center + window],
    [30, -30],
  );
  const visualTransform = useMotionTemplate`translate3d(0px, ${visualY}px, 0px)`;

  return (
    <article
      className={`shrink-0 w-screen h-full ${tone.bg} ${tone.fg} relative overflow-hidden`}
    >
      <div className="absolute inset-0 flex items-center">
        <div className="mx-auto max-w-wide w-full px-6 md:px-10 pt-32 pb-28 grid grid-cols-12 gap-6 items-center">
          <div className="col-span-12 lg:col-span-6 xl:col-span-5 flex flex-col gap-6">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="eyebrow opacity-70">
                № {project.n} · {project.year}
              </span>
              <span
                className={`eyebrow rounded-full border-2 px-3 py-1 inline-flex items-center gap-2 ${tone.chipBorder} ${tone.chipBg}`}
              >
                <span className={`h-[7px] w-[7px] rounded-full ${tone.dot}`} />
                {project.status}
              </span>
            </div>

            <h3 className="font-display uppercase leading-[0.86] tracking-tightest text-[clamp(44px,7vw,120px)]">
              {project.title.map((line, li) => (
                <span key={li} className={`block ${li === 1 ? tone.accent : ""}`}>
                  <KineticText delay={0.08 * li} stagger={0.05}>
                    {line}
                  </KineticText>
                </span>
              ))}
            </h3>

            <p className="max-w-[48ch] text-[16px] md:text-[18px] leading-relaxed opacity-90">
              {project.description}
            </p>

            {project.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {project.tags.map((t) => (
                  <span
                    key={t}
                    className={`rounded-full border-2 px-3 py-1 text-[12px] font-semibold tracking-tight ${tone.tagBg} ${tone.tagBorder} ${tone.tagText}`}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-2">
              {project.href ? (
                <Link
                  href={project.href}
                  className={`group inline-flex items-center gap-4 rounded-md px-7 py-4 press-scale ${tone.cta}`}
                >
                  <span className="eyebrow">Read case study</span>
                  <ArrowDiagonal className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              ) : (
                <span
                  className={`inline-flex items-center gap-4 rounded-md border-2 px-7 py-4 eyebrow opacity-80 ${
                    project.tone === "cobalt" ? "border-cream" : "border-ink"
                  }`}
                >
                  Write-up soon
                </span>
              )}
            </div>
          </div>

          <motion.div
            className="col-span-12 lg:col-span-6 xl:col-span-7 relative h-[52vh] lg:h-[70vh]"
            initial={false}
            style={{ transform: visualTransform }}
          >
            {project.tone === "cobalt" && <VisualF1 />}
            {project.tone === "pink" && <VisualEval />}
            {project.tone === "yellow" && <VisualReserved />}
          </motion.div>
        </div>
      </div>

      <div
        className={`pointer-events-none absolute -bottom-8 right-4 md:right-10 font-display uppercase leading-none tracking-tightest text-[clamp(160px,28vw,460px)] ${
          project.tone === "cobalt" ? "text-cream/10" : "text-ink/[0.06]"
        }`}
        aria-hidden
      >
        {project.n}
      </div>
    </article>
  );
}

/* ---------------- per-project visuals (static, CSS-only motion) ---------------- */

function VisualF1() {
  return (
    <div className="absolute inset-0 rounded-[24px] border-[2.5px] border-cream/40 bg-cobalt-deep/55 overflow-hidden">
      <svg
        viewBox="0 0 800 560"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="hg-hw" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(253,246,227,0.16)" strokeWidth="0.75" />
          </pattern>
        </defs>
        <rect width="800" height="560" fill="url(#hg-hw)" />
        <g fontFamily="var(--font-display)" fontSize="11" fill="rgba(253,246,227,0.7)" letterSpacing="2">
          <text x="40" y="40">LAP · 01</text>
          <text x="740" y="40" textAnchor="end">LAP · 57</text>
          <text x="40" y="530">P10</text>
          <text x="40" y="440">P6</text>
          <text x="40" y="340">P3</text>
          <text x="40" y="240">P1</text>
        </g>
        <path d="M 40 460 Q 180 180 360 320 T 760 140" fill="none" stroke="var(--cream)" strokeWidth="2" />
        <path
          d="M 40 500 Q 200 320 400 380 T 760 260"
          fill="none"
          stroke="var(--yellow)"
          strokeWidth="1.5"
          strokeDasharray="6 6"
        />
        <circle cx="760" cy="140" r="7" fill="var(--pink)" />
      </svg>
      <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
        <span className="eyebrow text-cream/80">Schematic · not live demo</span>
        <span className="eyebrow text-cream/60">Fig. 01 · Telemetry</span>
      </div>
    </div>
  );
}

function VisualEval() {
  const lines = [
    { text: "$ harness run --agent claude-sonnet --suite real-tasks" },
    { text: "▸ loaded 142 test cases · 8 capability slices" },
    { text: "▸ booting sandboxes · 12 parallel · max 180s" },
    { text: "▸ seeded rng · 20260423 · deterministic" },
    { text: "✓ 128 / 142 passed · 14 failures · 2 regressions", highlight: "signal" as const },
    { text: "→ report → ./runs/0147/report.html", highlight: "mint" as const },
  ];
  return (
    <div className="absolute inset-0 rounded-[24px] border-[2.5px] border-ink bg-cream overflow-hidden shadow-[12px_12px_0_0_var(--ink)]">
      <div className="flex items-center gap-2 bg-ink px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-pink" />
        <span className="h-3 w-3 rounded-full bg-yellow" />
        <span className="h-3 w-3 rounded-full bg-mint" />
        <span
          className="ml-3 text-[11px] text-cream/80 uppercase tracking-widest"
          style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
        >
          eval-harness · run 0147
        </span>
      </div>
      <div
        className="p-6 md:p-8 text-[13px] md:text-[14px] leading-[1.9] text-ink"
        style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
      >
        {lines.map((l, i) => (
          <div
            key={i}
            className={
              l.highlight === "signal"
                ? "text-pink font-semibold"
                : l.highlight === "mint"
                ? "text-ink font-semibold"
                : undefined
            }
          >
            {l.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function VisualReserved() {
  return (
    <div className="absolute inset-0 rounded-[24px] border-[2.5px] border-dashed border-ink/60 bg-cream overflow-hidden flex items-center justify-center">
      <svg className="absolute inset-0 h-full w-full opacity-40" aria-hidden>
        <defs>
          <pattern
            id="hatch-res"
            width="12"
            height="12"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="12" stroke="var(--ink)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hatch-res)" />
      </svg>

      <div className="relative w-[180px] h-[180px] md:w-[240px] md:h-[240px] rounded-full border-[2.5px] border-ink bg-pink flex items-center justify-center">
        <div className="stamp-rotate absolute inset-0">
          <svg viewBox="0 0 240 240" className="h-full w-full">
            <defs>
              <path
                id="reservedCircle"
                d="M 120,120 m -88,0 a 88,88 0 1,1 176,0 a 88,88 0 1,1 -176,0"
              />
            </defs>
            <text
              fontFamily="var(--font-display)"
              fontSize="14"
              fontWeight="700"
              letterSpacing="4"
              fill="var(--ink)"
              textLength={2 * Math.PI * 88}
              lengthAdjust="spacingAndGlyphs"
            >
              <textPath href="#reservedCircle" startOffset="0">
                RESERVED · COMING · SOON · RESERVED · COMING · SOON ·
              </textPath>
            </text>
          </svg>
        </div>
        <span className="relative z-10 font-display text-[32px] md:text-[48px] leading-none uppercase tracking-tightest text-ink">
          ★
        </span>
      </div>

      <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
        <span className="eyebrow text-ink/60">Fig. — placeholder stamp</span>
        <span className="eyebrow text-ink/60">Status · reserved</span>
      </div>
    </div>
  );
}

/* ---------------- reduced-motion fallback ---------------- */

function FallbackStack() {
  return (
    <section className="relative bg-cream text-ink px-6 md:px-10 py-20 md:py-28">
      <div className="mx-auto max-w-wide">
        <div className="mb-12">
          <span className="eyebrow text-ink/60">§ 01 · Featured work</span>
          <h2 className="mt-4 font-display uppercase text-hero-md">Three projects.</h2>
        </div>
        <div className="grid gap-5">
          {PROJECTS.map((p) => {
            const tone = TONE_MAP[p.tone];
            const inner = (
              <article className={`rounded-[24px] border-[2.5px] border-ink ${tone.bg} ${tone.fg} p-8 md:p-12`}>
                <span className="eyebrow opacity-70">
                  № {p.n} · {p.year}
                </span>
                <h3 className="mt-4 font-display uppercase text-[clamp(32px,5vw,72px)] leading-[0.92] tracking-tightest">
                  {p.title.join(" ")}
                </h3>
                <p className="mt-5 max-w-[56ch]">{p.description}</p>
              </article>
            );
            return p.href ? (
              <Link key={p.n} href={p.href}>
                {inner}
              </Link>
            ) : (
              <div key={p.n}>{inner}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
