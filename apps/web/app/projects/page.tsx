import Link from "next/link";
import type { Metadata } from "next";
import { ScrollReveal, Stagger, StaggerItem } from "@/components/motion/scroll-reveal";
import { KineticText } from "@/components/motion/kinetic-text";
import { Magnetic } from "@/components/motion/magnetic";
import { Marquee } from "@/components/layout/marquee";
import { ArrowBack, ArrowDiagonal } from "@/components/decoration/arrow";
import { WavyDivider } from "@/components/decoration/wavy-divider";

export const metadata: Metadata = {
  title: "Projects · Jules Tack",
  description: "Selected technical projects and AI-native product work.",
};

type Row = {
  title: string;
  summary: string;
  tags: string[];
  href?: string;
  status: "live" | "draft" | "reserved";
  bg: string;
};

const ROWS: Row[] = [
  {
    title: "F1 machine learning project",
    summary:
      "A live machine learning project with a 3D season explorer, race dossiers, automated refresh pipelines, and a Python API running behind the site.",
    tags: ["LightGBM", "Calibration", "Next.js", "FastAPI", "Railway"],
    href: "/projects/f1",
    status: "live",
    bg: "bg-pink",
  },
  {
    title: "Eval harness for coding agents",
    summary:
      "A lightweight, reproducible harness for stress-testing AI coding assistants on real tasks — because vibes-based benchmarks aren't benchmarks.",
    tags: ["Evals", "TypeScript", "Tooling"],
    status: "draft",
    bg: "bg-mint",
  },
  {
    title: "Reserved for next project",
    summary:
      "Space kept for the next serious piece. I'd rather have three strong projects than ten projects worth skimming.",
    tags: [],
    status: "reserved",
    bg: "bg-yellow",
  },
];

export default function ProjectsPage() {
  return (
    <>
      {/* mint hero */}
      <section className="relative bg-mint text-ink px-6 md:px-10 pt-40 pb-20 md:pt-44 overflow-hidden">
        <div className="mx-auto max-w-wide">
          <ScrollReveal>
            <span className="eyebrow text-ink/70">§ Projects · Archive</span>
          </ScrollReveal>
          <h1 className="mt-6 font-display uppercase text-hero-xl">
            <span className="block">
              <KineticText>Selected</KineticText>
            </span>
            <span className="block">
              <KineticText delay={0.12}>work.</KineticText>
            </span>
          </h1>

          <div className="mt-10 grid gap-8 md:grid-cols-[1.1fr_auto] items-end">
            <ScrollReveal>
              <p className="max-w-2xl text-[18px] md:text-[22px] leading-snug text-ink/90">
                A short list on purpose. Each entry is something I actually built, shipped, or am
                actively working on. The flagship gets a full project walkthrough — the rest get a
                line or two until they deserve more.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <Magnetic strength={0.25}>
                <Link
                  href="/"
                  className="group inline-flex items-center gap-3 rounded-md border-2 border-ink px-6 py-4 press-scale"
                >
                  <ArrowBack className="h-[14px] w-[40px] transition-transform duration-300 group-hover:-translate-x-0.5" />
                  <span className="eyebrow">Back home</span>
                </Link>
              </Magnetic>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <Marquee
        items={ROWS.map((r) => `${r.title.toUpperCase()} · ${r.status.toUpperCase()}`)}
        separator="●"
        speedSeconds={34}
        className="bg-ink text-cream py-5"
        trackClassName="font-display uppercase text-[clamp(24px,4.5vw,52px)] tracking-tighter"
      />

      {/* list */}
      <section className="relative bg-cream text-ink px-6 md:px-10 py-20 md:py-24">
        <div className="mx-auto max-w-wide">
          <Stagger className="grid gap-5 md:gap-6" staggerChildren={0.08}>
            {ROWS.map((r) => {
              const Inner = (
                <article
                  className={`relative rounded-[24px] border-[2.5px] border-ink ${r.bg} p-8 md:p-10 transition-transform press-scale`}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 lg:gap-10 items-start">
                    <div>
                      <h2 className="font-display uppercase text-[clamp(32px,5vw,72px)] leading-[0.92] tracking-tightest">
                        {r.title}
                      </h2>
                      <p className="mt-5 max-w-[56ch] text-[16px] md:text-[17px] leading-relaxed text-ink/85">
                        {r.summary}
                      </p>
                      {r.tags.length > 0 && (
                        <div className="mt-6 flex flex-wrap gap-2">
                          {r.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded-full border-2 border-ink bg-cream px-3 py-1 text-[12px] font-semibold tracking-tight"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-2 text-ink lg:pt-2">
                      {r.href ? (
                        <span className="inline-flex items-center gap-3">
                          <span className="eyebrow">Open project</span>
                          <ArrowDiagonal className="h-5 w-5 transition-transform duration-300" />
                        </span>
                      ) : (
                        <span className="eyebrow opacity-70">
                          {r.status === "draft" ? "In progress" : "Reserved"}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
              return (
                <StaggerItem key={r.title}>
                  {r.href ? (
                    <Link href={r.href} className="block group">
                      {Inner}
                    </Link>
                  ) : (
                    <div>{Inner}</div>
                  )}
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </section>

      <WavyDivider fromColor="var(--cream)" toColor="var(--ink)" height={72} />
    </>
  );
}
