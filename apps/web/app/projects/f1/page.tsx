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
      <section className="relative overflow-hidden bg-f1-dark px-6 pb-16 pt-32 text-cream md:px-10 md:pt-36">
        <div className="relative mx-auto max-w-wide">
          <ScrollReveal>
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-3 text-[12px] text-cream/55">
              <Link href="/projects" className="group inline-flex items-center gap-2 press-scale hover:text-cream">
                <ArrowBack className="h-[12px] w-[32px] transition-transform duration-300 group-hover:-translate-x-1" />
                <span className="eyebrow">All projects</span>
              </Link>
              <span aria-hidden className="text-cream/25">/</span>
              <span className="eyebrow text-cream/75">F1 machine learning project</span>
            </nav>
          </ScrollReveal>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div>
              <span className="inline-block rounded-full border border-f1-red/50 bg-f1-red/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-f1-red">
                Flagship · self-refreshing
              </span>
              <h1 className="mt-6 font-display uppercase text-display-lg">
                <span className="block text-f1-red">
                  <KineticText>F1 machine</KineticText>
                </span>
                <span className="block text-cream">
                  <KineticText delay={0.12}>learning project.</KineticText>
                </span>
              </h1>
              <ScrollReveal delay={0.08}>
                <p className="mt-6 max-w-[58ch] text-[16px] md:text-[18px] leading-relaxed text-cream/75">
                  A machine learning project that doubles as a real product. Historical race
                  dossiers, calibrated evaluation, and a session-aware GitHub Actions pipeline that
                  retrains the model after every F1 weekend and republishes predictions.
                </p>
              </ScrollReveal>
            </div>

            <ScrollReveal delay={0.12}>
              <div className="glass-panel-dark rounded-[22px] p-5 md:p-6">
                <p className="eyebrow text-cream/55">Current snapshot</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-[14px] bg-cream/[0.04] p-4">
                    <p className="eyebrow text-cream/45">model version</p>
                    <p className="mt-2 font-display text-[24px] tabular-nums tracking-tightest">{manifest.model_version}</p>
                  </div>
                  <div className="rounded-[14px] bg-cream/[0.04] p-4">
                    <p className="eyebrow text-cream/45">published</p>
                    <p className="mt-2 text-[13px] font-semibold text-cream/80">{manifest.generated_at}</p>
                  </div>
                  <div className="rounded-[14px] bg-cream/[0.04] p-4">
                    <p className="eyebrow text-cream/45">held-out log-loss</p>
                    <p className="mt-2 font-display text-[24px] tabular-nums tracking-tightest">
                      {primaryMetrics?.log_loss?.toFixed(3) ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-[14px] bg-cream/[0.04] p-4">
                    <p className="eyebrow text-cream/45">seasons public</p>
                    <p className="mt-2 font-display text-[22px] tabular-nums tracking-tightest">{manifest.seasons.join(" · ")}</p>
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
        separator="·"
        speedSeconds={36}
        className="bg-ink py-3 text-cream/80"
        trackClassName="font-display uppercase text-[clamp(16px,2.6vw,28px)] tracking-tight"
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
