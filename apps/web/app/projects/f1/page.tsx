import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowBack, ArrowDiagonal } from "@/components/decoration/arrow";
import { Marquee } from "@/components/layout/marquee";
import { ScrollReveal, Stagger, StaggerItem } from "@/components/motion/scroll-reveal";
import { KineticText } from "@/components/motion/kinetic-text";
import { WavyDivider } from "@/components/decoration/wavy-divider";
import { loadInsights, loadManifest } from "@/lib/f1-data";
import { targetEntries } from "@/lib/f1-types";

export default async function F1Page() {
  const manifest = await loadManifest();
  const insights = await loadInsights(2025);
  if (!manifest) notFound();

  const primary = manifest.targets[manifest.primary_target];
  const primaryMetrics = primary?.metrics;
  const targets = targetEntries(manifest);

  return (
    <>
      <section className="relative overflow-hidden bg-[#efe7dc] px-6 pb-20 pt-36 text-ink md:px-10 md:pt-40">
        <div className="mx-auto max-w-wide">
          <ScrollReveal>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="eyebrow text-ink/60">Flagship project · self-refreshing</span>
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
                <span className="block text-ink">
                  <KineticText delay={0.12}>learning</KineticText>
                </span>
                <span className="block text-ink">
                  <KineticText delay={0.24}>project.</KineticText>
                </span>
              </h1>
              <ScrollReveal delay={0.08}>
                <p className="mt-8 max-w-[56ch] text-[18px] md:text-[22px] leading-relaxed text-ink/82">
                  A recruiter-facing machine learning project that doubles as a real product:
                  historical season landscapes, race dossiers, calibrated evaluation, and a
                  session-aware GitHub Actions pipeline that retrains the model after every F1
                  weekend and republishes predictions.
                </p>
              </ScrollReveal>
            </div>

            <ScrollReveal delay={0.12}>
              <div className="rounded-[26px] border-[2.5px] border-ink bg-white-warm p-6 md:p-7">
                <p className="eyebrow text-ink/55">Current snapshot</p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-[18px] border border-ink/10 bg-[#f7f2ea] p-4">
                    <p className="eyebrow text-ink/45">model version</p>
                    <p className="mt-2 font-display text-[28px] tracking-tightest">{manifest.model_version}</p>
                  </div>
                  <div className="rounded-[18px] border border-ink/10 bg-[#f7f2ea] p-4">
                    <p className="eyebrow text-ink/45">published</p>
                    <p className="mt-2 text-[14px] font-semibold text-ink/75">{manifest.generated_at}</p>
                  </div>
                  <div className="rounded-[18px] border border-ink/10 bg-[#f7f2ea] p-4">
                    <p className="eyebrow text-ink/45">held-out log-loss</p>
                    <p className="mt-2 font-display text-[28px] tracking-tightest">
                      {primaryMetrics?.log_loss?.toFixed(3) ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-ink/10 bg-[#f7f2ea] p-4">
                    <p className="eyebrow text-ink/45">seasons public</p>
                    <p className="mt-2 font-display text-[28px] tracking-tightest">{manifest.seasons.join(" · ")}</p>
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
          "STATIC STORYTELLING",
          "CALIBRATION FIRST",
          "SEVEN TARGETS",
        ]}
        separator="●"
        speedSeconds={30}
        className="bg-ink py-5 text-[#f5d952]"
        trackClassName="font-display uppercase text-[clamp(24px,4.5vw,52px)] tracking-tighter"
      />

      <section className="relative bg-cream px-6 py-24 text-ink md:px-10 md:py-28">
        <div className="mx-auto max-w-wide">
          <div className="grid gap-10 md:grid-cols-[0.92fr_1.08fr] md:items-end">
            <div>
              <ScrollReveal>
                <span className="eyebrow text-ink/55">§ 01 · Surfaces</span>
                <h2 className="mt-5 font-display uppercase text-hero-md">
                  <KineticText>One system,</KineticText>
                  <span className="block">
                    <KineticText delay={0.1}>three ways in.</KineticText>
                  </span>
                </h2>
              </ScrollReveal>
            </div>
            <ScrollReveal delay={0.08}>
              <p className="max-w-[58ch] text-[17px] leading-relaxed text-ink/75">
                The project hub explains the system, the season explorer turns a full year into a
                topographic object, and the race dossier drills all the way down into driver-level
                probabilities with factors and the model&apos;s top explanatory features.
              </p>
            </ScrollReveal>
          </div>

          <Stagger className="mt-14 grid gap-5 md:grid-cols-3" staggerChildren={0.08}>
            {[
              {
                href: `/projects/f1/season/2025?target=${manifest.primary_target}`,
                title: "Season explorer",
                body: "The flagship 3D landscape. Browse the held-out season as one continuous prediction surface.",
                tone: "bg-[#efe6d8]",
              },
              {
                href: `/projects/f1/race/2025/24?target=${manifest.primary_target}`,
                title: "Race dossier",
                body: "Driver ranking, top factors, and held-out evaluation that regenerates automatically after each race.",
                tone: "bg-[#f4eee4]",
              },
              {
                href: "/projects/f1/models",
                title: "Models & honesty",
                body: "Target-by-target metrics, calibration, and the season misses that matter more than the wins.",
                tone: "bg-[#f1e2df]",
              },
            ].map((card) => (
              <StaggerItem key={card.href}>
                <Link
                  href={card.href}
                  className={`group block rounded-[24px] border-[2.5px] border-ink ${card.tone} p-6 transition-transform hover:-translate-y-[2px]`}
                >
                  <p className="eyebrow text-ink/45">Open</p>
                  <h3 className="mt-4 font-display text-[34px] uppercase tracking-tightest leading-[0.95]">
                    {card.title}
                  </h3>
                  <p className="mt-4 text-[15px] leading-relaxed text-ink/74">{card.body}</p>
                  <span className="mt-8 inline-flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.18em]">
                    Explore <ArrowDiagonal className="h-4 w-4" />
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <WavyDivider fromColor="var(--cream)" toColor="var(--yellow)" height={68} />

      <section className="relative bg-yellow px-6 py-24 text-ink md:px-10 md:py-28">
        <div className="mx-auto max-w-wide">
          <ScrollReveal>
            <span className="eyebrow text-ink/60">§ 02 · Targets</span>
          </ScrollReveal>
          <Stagger className="mt-8 grid gap-4 md:grid-cols-2" staggerChildren={0.06}>
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
                        <p className="mt-1 font-display text-[24px]">{target.metrics.log_loss.toFixed(3)}</p>
                      </div>
                      <div>
                        <p className="eyebrow text-ink/45">brier</p>
                        <p className="mt-1 font-display text-[24px]">{target.metrics.brier.toFixed(3)}</p>
                      </div>
                      <div>
                        <p className="eyebrow text-ink/45">ECE</p>
                        <p className="mt-1 font-display text-[24px]">{target.metrics.ece.toFixed(3)}</p>
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
    </>
  );
}
