"use client";

import Link from "next/link";
import { ArrowDiagonal } from "@/components/decoration/arrow";
import { KineticText } from "@/components/motion/kinetic-text";

type Project = {
  eyebrow: string;
  title: string[];
  description: string;
  tags: string[];
  href?: string;
  tone: "cobalt" | "pink" | "yellow";
};

const PROJECTS: Project[] = [
  {
    eyebrow: "Flagship project",
    title: ["F1 machine", "learning", "project."],
    description:
      "A recruiter-facing machine learning project with a live Python inference API, a 3D season explorer, and historical evaluation that stays honest about misses.",
    tags: ["LightGBM", "Calibration", "Next.js", "FastAPI", "Railway"],
    href: "/projects/f1",
    tone: "cobalt",
  },
  {
    eyebrow: "In progress",
    title: ["Evaluation harness", "for coding", "agents."],
    description:
      "A lightweight, reproducible harness for stress-testing AI coding assistants on real tasks, with deterministic runs and review-ready reports.",
    tags: ["Evals", "TypeScript", "Tooling"],
    tone: "pink",
  },
  {
    eyebrow: "Reserved",
    title: ["Reserved", "for the", "next project."],
    description:
      "Space kept for the next serious piece. I'd rather have three strong projects than ten projects worth skimming.",
    tags: [],
    tone: "yellow",
  },
];

const TONE_MAP: Record<
  Project["tone"],
  { bg: string; fg: string; accent: string; tagBg: string; tagBorder: string; tagText: string; cta: string }
> = {
  cobalt: {
    bg: "bg-cobalt",
    fg: "text-cream",
    accent: "text-yellow",
    tagBg: "bg-cobalt-deep",
    tagBorder: "border-cream",
    tagText: "text-cream",
    cta: "bg-yellow text-ink",
  },
  pink: {
    bg: "bg-pink",
    fg: "text-ink",
    accent: "text-cream",
    tagBg: "bg-cream",
    tagBorder: "border-ink",
    tagText: "text-ink",
    cta: "bg-ink text-cream",
  },
  yellow: {
    bg: "bg-cream",
    fg: "text-ink",
    accent: "text-pink",
    tagBg: "bg-cream-deep",
    tagBorder: "border-ink",
    tagText: "text-ink",
    cta: "bg-ink text-cream",
  },
};

export function HorizontalWork() {
  return (
    <section className="relative bg-cream px-6 py-20 text-ink md:px-10 md:py-28">
      <div className="mx-auto max-w-wide">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6 md:mb-14">
          <div>
            <span className="eyebrow text-ink/60">Featured work</span>
            <h2 className="mt-4 font-display uppercase text-hero-md">
              Three projects,
              <span className="block">built to be explored.</span>
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

        <div className="grid gap-6 xl:gap-8">
          {PROJECTS.map((project) => (
            <ProjectPanel key={project.title.join("-")} project={project} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProjectPanel({ project }: { project: Project }) {
  const tone = TONE_MAP[project.tone];
  const content = (
    <article
      className={`overflow-hidden rounded-[28px] border-[2.5px] border-ink ${tone.bg} ${tone.fg}`}
    >
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] xl:gap-12">
        <div className="flex flex-col gap-6 p-8 md:p-12 xl:p-14">
          <div className="flex items-center justify-between gap-4">
            <span className="eyebrow opacity-70">{project.eyebrow}</span>
          </div>

          <h3 className="font-display uppercase leading-[0.88] tracking-tightest text-[clamp(42px,5.2vw,88px)]">
            {project.title.map((line, index) => (
              <span key={line} className={`block ${index === 1 ? tone.accent : ""}`}>
                <KineticText delay={0.08 * index} stagger={0.045}>
                  {line}
                </KineticText>
              </span>
            ))}
          </h3>

          <p className="max-w-[46ch] text-[16px] leading-relaxed opacity-90 md:text-[18px]">
            {project.description}
          </p>

          {project.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className={`rounded-full border-2 px-3 py-1 text-[12px] font-semibold tracking-tight ${tone.tagBg} ${tone.tagBorder} ${tone.tagText}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-2">
            {project.href ? (
              <Link
                href={project.href}
                className={`group inline-flex items-center gap-4 rounded-md px-7 py-4 press-scale ${tone.cta}`}
              >
                <span className="eyebrow">Explore project</span>
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

        <div className="relative min-h-[320px] p-8 pt-0 md:min-h-[420px] md:p-12 md:pt-0 xl:min-h-[560px] xl:p-14 xl:pl-0">
          {project.tone === "cobalt" ? <VisualF1 /> : null}
          {project.tone === "pink" ? <VisualEval /> : null}
          {project.tone === "yellow" ? <VisualReserved /> : null}
        </div>
      </div>
    </article>
  );

  return project.href ? <div>{content}</div> : content;
}

function VisualF1() {
  return (
    <div className="absolute inset-8 overflow-hidden rounded-[24px] border-[2.5px] border-cream/40 bg-cobalt-deep/55 md:inset-12 xl:inset-y-14 xl:right-14 xl:left-0">
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
        <span className="eyebrow text-cream/80">Illustrative · static schematic</span>
        <span className="eyebrow text-cream/60">Fig. 01 · telemetry</span>
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
    <div className="absolute inset-8 overflow-hidden rounded-[24px] border-[2.5px] border-ink bg-cream shadow-[12px_12px_0_0_var(--ink)] md:inset-12 xl:inset-y-14 xl:right-14 xl:left-0">
      <div className="flex items-center gap-2 bg-ink px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-pink" />
        <span className="h-3 w-3 rounded-full bg-yellow" />
        <span className="h-3 w-3 rounded-full bg-mint" />
        <span
          className="ml-3 text-[11px] uppercase tracking-widest text-cream/80"
          style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
        >
          eval-harness · run 0147
        </span>
      </div>
      <div
        className="p-6 text-[13px] leading-[1.9] text-ink md:p-8 md:text-[14px]"
        style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
      >
        {lines.map((line, index) => (
          <div
            key={index}
            className={
              line.highlight === "signal"
                ? "font-semibold text-pink"
                : line.highlight === "mint"
                  ? "font-semibold text-ink"
                  : undefined
            }
          >
            {line.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function VisualReserved() {
  return (
    <div className="absolute inset-8 flex items-center justify-center overflow-hidden rounded-[24px] border-[2.5px] border-dashed border-ink/60 bg-cream md:inset-12 xl:inset-y-14 xl:right-14 xl:left-0">
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

      <div className="relative mx-8 max-w-[340px] rotate-[-4deg] rounded-[26px] border-[2.5px] border-ink bg-white-warm p-6 shadow-[12px_12px_0_0_var(--pink)] md:p-8">
        <p className="eyebrow text-ink/50">Next slot</p>
        <h4 className="mt-3 font-display text-[32px] uppercase leading-[0.9] tracking-tightest text-ink md:text-[40px]">
          Something sharper is coming.
        </h4>
        <p className="mt-4 text-[14px] leading-relaxed text-ink/72 md:text-[15px]">
          I keep one slot open so the next project earns its place instead of filling space.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border-2 border-ink bg-cream px-3 py-1">
          <span className="h-2.5 w-2.5 rounded-full bg-pink" />
          <span className="eyebrow text-ink">Reserved</span>
        </div>
      </div>

      <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
        <span className="eyebrow text-ink/60">Fig. — placeholder note</span>
        <span className="eyebrow text-ink/60">Status · reserved</span>
      </div>
    </div>
  );
}
