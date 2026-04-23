import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowBack } from "@/components/decoration/arrow";
import { ScrollReveal, Stagger, StaggerItem } from "@/components/motion/scroll-reveal";
import { KineticText } from "@/components/motion/kinetic-text";
import { ReliabilityPlot } from "@/components/f1/reliability-plot";
import { loadInsights, loadManifest } from "@/lib/f1-data";
import { targetEntries } from "@/lib/f1-types";

export default async function ModelsPage() {
  const manifest = await loadManifest();
  const insights = await loadInsights(2025);
  if (!manifest || !insights) notFound();

  return (
    <>
      <section className="relative bg-[#f4eee4] px-6 pb-16 pt-32 text-ink md:px-10 md:pt-36">
        <div className="mx-auto max-w-wide">
          <ScrollReveal>
            <Link href="/projects/f1" className="group inline-flex items-center gap-3 press-scale">
              <ArrowBack className="h-[14px] w-[44px] transition-transform duration-300 group-hover:-translate-x-1" />
              <span className="eyebrow">Back to F1 lab</span>
            </Link>
          </ScrollReveal>
          <div className="mt-8 grid gap-8 md:grid-cols-[0.92fr_1.08fr]">
            <div>
              <ScrollReveal>
                <span className="eyebrow text-ink/55">§ Models</span>
                <h1 className="mt-5 font-display uppercase text-hero-md">
                  <KineticText>Metrics, calibration,</KineticText>
                  <span className="block text-[#d93e2b]">
                    <KineticText delay={0.12}>and misses.</KineticText>
                  </span>
                </h1>
              </ScrollReveal>
            </div>
            <ScrollReveal delay={0.08}>
              <p className="max-w-[58ch] text-[17px] leading-relaxed text-ink/72">
                This page is deliberately not a victory lap. The goal is to show where the model earns
                trust, where it drifts, and which targets are genuinely useful versus merely interesting.
              </p>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="relative bg-cream px-6 py-20 text-ink md:px-10 md:py-24" id="calibration">
        <div className="mx-auto max-w-wide">
          <ScrollReveal>
            <span className="eyebrow text-ink/55">Calibration</span>
          </ScrollReveal>
          <div className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[26px] border-[2.5px] border-ink bg-white-warm p-6">
              <ReliabilityPlot bins={insights.reliability?.bins ?? []} />
            </div>
            <div className="rounded-[26px] border-[2.5px] border-ink bg-[#f7f2ea] p-6">
              <h2 className="font-display text-[34px] uppercase tracking-tightest">Held-out 2025 reliability</h2>
              <p className="mt-4 text-[15px] leading-relaxed text-ink/72">
                The diagonal is the promise. If the model says 0.70 often, reality should land near
                0.70 often. The more the red curve hugs that line, the more the interface can present
                probabilities as something worth reading rather than decorative certainty.
              </p>
              <div className="mt-6 space-y-3">
                {insights.reliability?.surprises.slice(0, 5).map((item) => (
                  <div key={`${item.driver}-${item.round}`} className="rounded-[18px] border border-ink/10 bg-white-warm px-4 py-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">{item.driver}</p>
                        <p className="text-[12px] text-ink/55">{item.event_name}</p>
                      </div>
                      <div className="text-right text-[12px]">
                        <p>{(item.p * 100).toFixed(0)}%</p>
                        <p className="text-ink/55">surprise {item.surprise.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative bg-[#efe7dc] px-6 py-20 text-ink md:px-10 md:py-24">
        <div className="mx-auto max-w-wide">
          <ScrollReveal>
            <span className="eyebrow text-ink/55">Target sheet</span>
          </ScrollReveal>
          <Stagger className="mt-8 grid gap-4 md:grid-cols-2" staggerChildren={0.06}>
            {targetEntries(manifest).map(([targetName, target]) => (
              <StaggerItem key={targetName}>
                <div className="rounded-[22px] border-[2.5px] border-ink bg-white-warm p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold">{target.display}</p>
                      <p className="text-[13px] text-ink/58">best model {target.model}</p>
                    </div>
                    <span className="rounded-full border border-ink/10 bg-[#f7f2ea] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                      {target.seasons.join(" · ")}
                    </span>
                  </div>
                  {target.metrics ? (
                    <div className="mt-5 grid grid-cols-4 gap-3 text-[13px]">
                      <div>
                        <p className="eyebrow text-ink/45">n</p>
                        <p className="mt-1 font-display text-[24px]">{target.metrics.n}</p>
                      </div>
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
        </div>
      </section>
    </>
  );
}
