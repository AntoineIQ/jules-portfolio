"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { KineticText } from "@/components/motion/kinetic-text";
import { ArrowDiagonal } from "@/components/decoration/arrow";

export function FeaturedWork() {
  const reduce = useReducedMotion();
  return (
    <section className="relative bg-cream text-ink px-6 md:px-10 py-20 md:py-28">
      <div className="mx-auto max-w-wide">
        <div className="flex items-end justify-between gap-6 flex-wrap mb-10 md:mb-14">
          <ScrollReveal>
            <span className="eyebrow text-ink/60">§ 01 · Featured work</span>
            <h2 className="mt-4 font-display uppercase text-hero-md">
              <KineticText>The work,</KineticText>
              <span className="block">
                <KineticText delay={0.08}>up front.</KineticText>
              </span>
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <Link
              href="/projects"
              className="group inline-flex items-center gap-3 rounded-md border-2 border-ink px-6 py-3 press-scale"
            >
              <span className="eyebrow">All projects</span>
              <ArrowDiagonal className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={0.05}>
          <motion.div
            whileHover={reduce ? undefined : { transform: "translate3d(0px, -6px, 0px)" }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] as const }}
          >
            <Link
              href="/projects/f1"
              className="group block border-[2.5px] border-ink rounded-[20px] bg-white-warm overflow-hidden"
            >
              <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="p-8 md:p-10 lg:p-14 flex flex-col gap-8 border-b-[2.5px] lg:border-b-0 lg:border-r-[2.5px] border-ink">
                  <div className="flex items-center justify-between">
                    <span className="eyebrow text-ink/70">Flagship · 2026</span>
                    <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-pink px-3 py-1">
                      <span className="h-[6px] w-[6px] rounded-full bg-ink" />
                      <span className="eyebrow">Flagship project</span>
                    </span>
                  </div>

                  <h3 className="font-display uppercase text-[clamp(40px,7vw,96px)] leading-[0.88] tracking-tightest">
                    F1 machine-<br />learning<br />project.
                  </h3>

                  <p className="max-w-[42ch] text-[16px] md:text-[17px] leading-relaxed text-ink/85">
                    End-to-end machine learning system that predicts F1 race outcomes and makes
                    the reasoning inspectable.
                  </p>

                  <div className="mt-auto flex flex-wrap gap-2">
                    {["XGBoost", "Calibration", "Next.js", "DuckDB", "FastAPI"].map((t) => (
                      <span
                        key={t}
                        className="rounded-full border-2 border-ink bg-cream px-3 py-1 text-[12px] font-semibold tracking-tight"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="relative aspect-[16/11] lg:aspect-auto bg-cobalt text-cream overflow-hidden">
                  {/* decorative schematic telemetry */}
                  <svg
                    viewBox="0 0 800 560"
                    className="absolute inset-0 h-full w-full"
                    preserveAspectRatio="xMidYMid slice"
                  >
                    <defs>
                      <pattern id="hg" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(253,246,227,0.15)" strokeWidth="0.75" />
                      </pattern>
                    </defs>
                    <rect width="800" height="560" fill="url(#hg)" />
                    <g fontFamily="var(--font-display)" fontSize="10" fill="rgba(253,246,227,0.7)" letterSpacing="2">
                      <text x="40" y="38">LAP · 01</text>
                      <text x="740" y="38" textAnchor="end">LAP · 57</text>
                      <text x="40" y="530">P10</text>
                      <text x="40" y="440">P6</text>
                      <text x="40" y="340">P3</text>
                      <text x="40" y="240">P1</text>
                    </g>
                    <motion.path
                      d="M 40 460 Q 180 180 360 320 T 760 140"
                      fill="none"
                      stroke="var(--cream)"
                      strokeWidth="2"
                      initial={reduce ? undefined : { pathLength: 0 }}
                      whileInView={{ pathLength: 1 }}
                      viewport={{ once: true, margin: "-10%" }}
                      transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] as const }}
                    />
                    <motion.path
                      d="M 40 500 Q 200 320 400 380 T 760 260"
                      fill="none"
                      stroke="var(--yellow)"
                      strokeWidth="1.5"
                      strokeDasharray="6 6"
                      initial={reduce ? undefined : { pathLength: 0 }}
                      whileInView={{ pathLength: 1 }}
                      viewport={{ once: true, margin: "-10%" }}
                      transition={{ duration: 2.1, ease: [0.16, 1, 0.3, 1] as const, delay: 0.15 }}
                    />
                    <circle cx="760" cy="140" r="6" fill="var(--pink)" />
                    <circle cx="760" cy="260" r="4" fill="var(--yellow)" />
                  </svg>

                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4">
                    <span className="eyebrow text-cream/80">Schematic · not live demo</span>
                    <span className="inline-flex items-center gap-2 rounded-full border-2 border-cream bg-ink/40 backdrop-blur px-3 py-1 text-cream">
                      <span className="eyebrow">Explore project</span>
                      <ArrowDiagonal className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        </ScrollReveal>

        {/* other project placeholders */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            { n: "02", title: "Evaluation harness for coding agents", when: "2026 · In progress", bg: "bg-mint" },
            { n: "03", title: "Reserved for next project", when: "Soon", bg: "bg-yellow" },
          ].map((c) => (
            <ScrollReveal key={c.n} delay={0.05}>
              <article className={`relative rounded-[20px] border-[2.5px] border-ink ${c.bg} p-8 min-h-[180px]`}>
                <div className="flex items-start justify-between">
                  <span className="eyebrow opacity-70">№ {c.n}</span>
                  <span className="eyebrow rounded-full border-2 border-ink bg-white-warm px-3 py-1">
                    {c.when}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-[28px] md:text-[34px] uppercase tracking-tightest leading-[0.95] max-w-[18ch]">
                  {c.title}
                </h3>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
