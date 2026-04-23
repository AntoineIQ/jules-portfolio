import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowBack } from "@/components/decoration/arrow";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { KineticText } from "@/components/motion/kinetic-text";
import { SeasonExplorer } from "@/components/f1/season-explorer";
import { loadManifest, loadSeasonData } from "@/lib/f1-data";

export async function generateStaticParams() {
  return [2024, 2025, 2026].map((season) => ({ season: String(season) }));
}

export default async function SeasonPage({
  params,
  searchParams,
}: {
  params: Promise<{ season: string }>;
  searchParams: Promise<{ target?: string }>;
}) {
  const { season: seasonParam } = await params;
  const { target: targetParam } = await searchParams;
  const season = Number(seasonParam);
  const manifest = await loadManifest();
  if (!manifest || !manifest.seasons.includes(season)) notFound();
  const target = targetParam && manifest.targets[targetParam] ? targetParam : manifest.primary_target;
  const data = await loadSeasonData(season, target);
  if (!data) notFound();

  return (
    <>
      <section className="relative bg-cream px-6 pb-10 pt-32 text-ink md:px-10">
        <div className="mx-auto max-w-wide">
          <ScrollReveal>
            <Link href="/projects/f1" className="group inline-flex items-center gap-3 press-scale">
              <ArrowBack className="h-[14px] w-[44px] transition-transform duration-300 group-hover:-translate-x-1" />
              <span className="eyebrow">F1 lab overview</span>
            </Link>
          </ScrollReveal>

          <div className="mt-8 grid gap-8 md:grid-cols-[0.92fr_1.08fr]">
            <div>
              <ScrollReveal>
                <span className="eyebrow text-ink/55">§ Season view</span>
                <h1 className="mt-5 font-display uppercase text-hero-md">
                  <KineticText>{`${season} season`}</KineticText>
                  <span className="block text-[#d93e2b]">
                    <KineticText delay={0.12}>landscape.</KineticText>
                  </span>
                </h1>
              </ScrollReveal>
            </div>
            <ScrollReveal delay={0.08}>
              <p className="max-w-[58ch] text-[17px] leading-relaxed text-ink/72">
                This is the flagship explorer: every driver, every race, one target at a time. The
                3D surface is built from the held-out predictions for this season, so the shape you
                see is evaluation data rather than a polished mock.
              </p>
            </ScrollReveal>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {manifest.seasons.map((candidate) => (
              <Link
                key={candidate}
                href={`/projects/f1/season/${candidate}?target=${target}`}
                className={`rounded-full border-2 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] ${
                  candidate === season ? "border-ink bg-ink text-cream" : "border-ink/20 bg-white-warm text-ink/68"
                }`}
              >
                {candidate}
              </Link>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {Object.entries(manifest.targets).map(([name, entry]) => (
              <Link
                key={name}
                href={`/projects/f1/season/${season}?target=${name}`}
                className={`rounded-full border px-3 py-2 text-[12px] font-semibold ${
                  name === target ? "border-ink bg-[#d93e2b] text-white" : "border-ink/15 bg-[#f7f2ea] text-ink/72"
                }`}
              >
                {entry.display}
              </Link>
            ))}
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-4">
            <div className="rounded-[18px] border-[2px] border-ink bg-white-warm p-4">
              <p className="eyebrow text-ink/45">log-loss</p>
              <p className="mt-2 font-display text-[30px]">{data.metrics.log_loss?.toFixed(3) ?? "—"}</p>
            </div>
            <div className="rounded-[18px] border-[2px] border-ink bg-white-warm p-4">
              <p className="eyebrow text-ink/45">brier</p>
              <p className="mt-2 font-display text-[30px]">{data.metrics.brier?.toFixed(3) ?? "—"}</p>
            </div>
            <div className="rounded-[18px] border-[2px] border-ink bg-white-warm p-4">
              <p className="eyebrow text-ink/45">ECE</p>
              <p className="mt-2 font-display text-[30px]">{data.metrics.ece?.toFixed(3) ?? "—"}</p>
            </div>
            <div className="rounded-[18px] border-[2px] border-ink bg-white-warm p-4">
              <p className="eyebrow text-ink/45">model</p>
              <p className="mt-2 font-display text-[30px]">{data.model}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative bg-cream px-6 pb-24 text-ink md:px-10">
        <div className="mx-auto max-w-wide">
          <SeasonExplorer data={data} target={target} />
        </div>
      </section>
    </>
  );
}
