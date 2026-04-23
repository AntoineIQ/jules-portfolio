import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowBack } from "@/components/decoration/arrow";
import { Marquee } from "@/components/layout/marquee";
import { ScrollReveal, Stagger, StaggerItem } from "@/components/motion/scroll-reveal";
import { KineticText } from "@/components/motion/kinetic-text";
import { loadInsights, loadManifest } from "@/lib/f1-data";
import { targetEntries } from "@/lib/f1-types";
import { FeaturedRace } from "@/components/f1/featured-race";
import { RacesGrid } from "@/components/f1/races-grid";

export default async function F1Page() {
  const manifest = await loadManifest();
  const insights = await loadInsights(2025);
  if (!manifest) notFound();

  const primary = manifest.targets[manifest.primary_target];
  const primaryMetrics = primary?.metrics;
  const targets = targetEntries(manifest);

  const seasonKeys = Object.keys(manifest.available_rounds)
    .map(Number)
    .sort((a, b) => b - a);
  const latestSeason = seasonKeys[0] ?? 2026;

  return (
    <>
      <section className="relative overflow-hidden bg-[#0b0b0d] px-6 pb-20 pt-36 text-cream md:px-10 md:pt-40">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, rgba(255,255,255,0.7) 0 16px, transparent 16px 32px)",
          }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[4px] bg-[#d93e2b]" aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[4px] bg-yellow" aria-hidden />

        <div className="relative mx-auto max-w-wide">
          <ScrollReveal>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="eyebrow text-cream/55">Flagship project · self-refreshing</span>
              <Link href="/projects" className="group inline-flex items-center gap-3 press-scale">
                <ArrowBack className="h-[14px] w-[44px] transition-transform duration-300 group-hover:-translate-x-1" />
                <span className="eyebrow">All projects</span>
              </Link>
            </div>
          </ScrollReveal>

          <div className="mt-10 grid gap-10 md:grid-cols-[1.05fr_0.95fr] md:items-end">
            <div>
              <h1 className="font-display uppercase text-hero-xl text-[#d93e2b]">
                <span className="block">
                  <KineticText>F1 machine</KineticText>
                </span>
                <span className="block text-cream">
                  <KineticText delay={0.12}>learning</KineticText>
                </span>
                <span className="block text-yellow">
                  <KineticText delay={0.24}>project.</KineticText>
                </span>
              </h1>
              <ScrollReveal delay={0.08}>
                <p className="mt-8 max-w-[56ch] text-[18px] md:text-[22px] leading-relaxed text-cream/82">
                  A recruiter-facing machine learning project that doubles as a real product:
                  historical race dossiers, calibrated evaluation, and a session-aware GitHub
                  Actions pipeline that retrains the model after every F1 weekend and republishes
                  predictions.
                </p>
              </ScrollReveal>
            </div>

            <ScrollReveal delay={0.12}>
              <div className="rounded-[26px] border-[2.5px] border-cream/20 bg-cream/[0.04] p-6 md:p-7 backdrop-blur-sm">
                <p className="eyebrow text-cream/55">Current snapshot</p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-[18px] border border-cream/10 bg-cream/[0.03] p-4">
                    <p className="eyebrow text-cream/45">model version</p>
                    <p className="mt-2 font-display text-[28px] tabular-nums tracking-tightest">{manifest.model_version}</p>
                  </div>
                  <div className="rounded-[18px] border border-cream/10 bg-cream/[0.03] p-4">
                    <p className="eyebrow text-cream/45">published</p>
                    <p className="mt-2 text-[14px] font-semibold text-cream/80">{manifest.generated_at}</p>
                  </div>
                  <div className="rounded-[18px] border border-cream/10 bg-cream/[0.03] p-4">
                    <p className="eyebrow text-cream/45">held-out log-loss</p>
                    <p className="mt-2 font-display text-[28px] tabular-nums tracking-tightest">
                      {primaryMetrics?.log_loss?.toFixed(3) ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-cream/10 bg-cream/[0.03] p-4">
                    <p className="eyebrow text-cream/45">seasons public</p>
                    <p className="mt-2 font-display text-[28px] tabular-nums tracking-tightest">{manifest.seasons.join(" · ")}</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <Marquee
        items={[
          "SELF-REFRESHING PIPELINE",
          "RETRAINED EVERY SESSION",
          "STATIC PUBLISH",
          "CALIBRATION FIRST",
          "SEVEN TARGETS",
        ]}
        separator="▲"
        speedSeconds={30}
        className="bg-[#d93e2b] py-4 text-cream border-y-[3px] border-ink"
        trackClassName="font-display uppercase text-[clamp(22px,4vw,48px)] tracking-tighter"
      />

      <FeaturedRace />

      <RacesGrid season={latestSeason} />

      <section className="relative bg-yellow px-6 py-20 text-ink md:px-10 md:py-24">
        <div className="mx-auto max-w-wide">
          <ScrollReveal>
            <span className="eyebrow text-ink/60">§ Targets</span>
            <h2 className="mt-4 font-display uppercase text-display-md">
              <KineticText>Seven targets,</KineticText>
              <span className="block">
                <KineticText delay={0.1}>one model family.</KineticText>
              </span>
            </h2>
            <p className="mt-5 max-w-[55ch] text-[15px] leading-relaxed text-ink/72">
              Each target is trained independently with calibrated probabilities. Metrics are held-out across all public seasons, not cherry-picked.
            </p>
          </ScrollReveal>

          <Stagger className="mt-12 grid gap-4 md:grid-cols-2" staggerChildren={0.06}>
            {targets.map(([targetName, target]) => (
              <StaggerItem key={targetName}>
                <div className="rounded-[22px] border-[2.5px] border-ink bg-cream p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{target.display}</p>
                      <p className="text-[13px] text-ink/65">best model: {target.model}</p>
                    </div>
                    <span className="rounded-full border border-ink/15 bg-white-warm px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                      {target.seasons.join(" · ")}
                    </span>
                  </div>
                  {target.metrics ? (
                    <div className="mt-4 grid grid-cols-3 gap-3 text-[13px]">
                      <div>
                        <p className="eyebrow text-ink/45">log-loss</p>
                        <p className="mt-1 font-display text-[24px] tabular-nums">{target.metrics.log_loss.toFixed(3)}</p>
                      </div>
                      <div>
                        <p className="eyebrow text-ink/45">brier</p>
                        <p className="mt-1 font-display text-[24px] tabular-nums">{target.metrics.brier.toFixed(3)}</p>
                      </div>
                      <div>
                        <p className="eyebrow text-ink/45">ECE</p>
                        <p className="mt-1 font-display text-[24px] tabular-nums">{target.metrics.ece.toFixed(3)}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </StaggerItem>
            ))}
          </Stagger>

          {insights?.reliability ? (
            <ScrollReveal className="mt-12">
              <div className="rounded-[26px] border-[2.5px] border-ink bg-cream p-6 md:p-7">
                <p className="eyebrow text-ink/55">Primary honesty check</p>
                <p className="mt-3 max-w-[58ch] text-[15px] leading-relaxed text-ink/72">
                  The main public story stays anchored on the held-out {insights.season} season.
                  Predictions for each race are regenerated after every session, but the historical
                  evaluation stays honest by preserving the numbers as they were first tested.
                </p>
              </div>
            </ScrollReveal>
          ) : null}
        </div>
      </section>

      <section className="relative bg-[#0b0b0d] px-6 py-16 text-cream md:px-10">
        <div className="mx-auto flex max-w-wide flex-wrap items-center justify-between gap-6">
          <div>
            <span className="eyebrow text-cream/50">Under the hood</span>
            <p className="mt-3 max-w-[48ch] text-[15px] leading-relaxed text-cream/80">
              Training lives in the <code className="font-mono text-[13px] text-yellow">ml/</code> folder — LightGBM per target, isotonic calibration, regulation-era weighting. The GitHub Actions pipeline rewrites itself weekly to schedule runs ~30 minutes after every F1 session.
            </p>
          </div>
          <Link
            href="https://github.com/AntoineIQ/jules-portfolio/tree/main/ml"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-3 rounded-full border-[2px] border-cream/40 bg-cream/5 px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.18em] hover:border-cream"
          >
            Source on GitHub
          </Link>
        </div>
      </section>
    </>
  );
}
