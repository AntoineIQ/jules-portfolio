import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowBack } from "@/components/decoration/arrow";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { KineticText } from "@/components/motion/kinetic-text";
import { loadManifest, loadRaceData } from "@/lib/f1-data";

function featureLabel(feature: string) {
  const labels: Record<string, string> = {
    grid_position: "grid",
    quali_gap_to_pole: "quali gap",
    driver_points_last_3: "form 3",
    driver_points_last_5: "form 5",
    driver_finish_last_3: "finish 3",
    driver_track_history: "track",
    team_points_last_3: "team",
    circuit_finish_std: "chaos",
    circuit_grid_to_finish: "overtake",
    regulation_era: "era",
    fp_best_gap_to_fastest: "FP best",
    fp_long_run_gap_to_fastest: "FP long",
    driver_quali_gap_last_3: "quali form",
    driver_quali_top10_rate_last_10: "Q3 rate",
    sprint_grid_position: "sprint grid",
    grid_vs_teammate: "vs teammate grid",
    quali_gap_vs_teammate: "vs teammate quali",
  };
  return labels[feature] ?? feature;
}

export async function generateStaticParams() {
  const manifest = await loadManifest();
  if (!manifest) return [];
  return Object.entries(manifest.available_rounds).flatMap(([season, rounds]) =>
    rounds.map((round) => ({ season, round: String(round).padStart(2, "0") })),
  );
}

export default async function RacePage({
  params,
  searchParams,
}: {
  params: Promise<{ season: string; round: string }>;
  searchParams: Promise<{ target?: string }>;
}) {
  const { season: seasonParam, round: roundParam } = await params;
  const { target: targetParam } = await searchParams;
  const season = Number(seasonParam);
  const round = Number(roundParam);
  const manifest = await loadManifest();
  if (!manifest) notFound();
  const target = targetParam && manifest.targets[targetParam] ? targetParam : manifest.primary_target;
  const data = await loadRaceData(season, round, target);
  if (!data) notFound();

  return (
    <>
      <section className="relative bg-[#f4eee4] px-6 pb-16 pt-32 text-ink md:px-10">
        <div className="mx-auto max-w-wide">
          <ScrollReveal>
            <Link href={`/projects/f1/season/${season}?target=${target}`} className="group inline-flex items-center gap-3 press-scale">
              <ArrowBack className="h-[14px] w-[44px] transition-transform duration-300 group-hover:-translate-x-1" />
              <span className="eyebrow">Back to season explorer</span>
            </Link>
          </ScrollReveal>

          <div className="mt-8 grid gap-8 md:grid-cols-[0.92fr_1.08fr]">
            <div>
              <ScrollReveal>
                <span className="eyebrow text-ink/55">
                  § Race dossier · {season} / round {String(round).padStart(2, "0")}
                </span>
                <h1 className="mt-5 font-display uppercase text-hero-md">
                  <KineticText>{data.event_name}</KineticText>
                </h1>
              </ScrollReveal>
            </div>
            <ScrollReveal delay={0.08}>
              <p className="max-w-[58ch] text-[17px] leading-relaxed text-ink/72">
                Historical evaluation for <strong>{data.target_display}</strong>. Ranking and top factors are taken from the held-out export for this race. The model retrains after every F1 session via GitHub Actions and republishes fresh predictions automatically.
              </p>
            </ScrollReveal>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {Object.entries(manifest.targets).map(([name, entry]) => (
              <Link
                key={name}
                href={`/projects/f1/race/${season}/${round}?target=${name}`}
                className={`rounded-full border px-3 py-2 text-[12px] font-semibold ${
                  name === target ? "border-ink bg-[#d93e2b] text-white" : "border-ink/15 bg-white/70 text-ink/72"
                }`}
              >
                {entry.display}
              </Link>
            ))}
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-4">
            <div className="rounded-[18px] border-[2px] border-ink bg-white-warm p-4">
              <p className="eyebrow text-ink/45">drivers</p>
              <p className="mt-2 font-display text-[30px]">{data.metrics.n}</p>
            </div>
            <div className="rounded-[18px] border-[2px] border-ink bg-white-warm p-4">
              <p className="eyebrow text-ink/45">log-loss</p>
              <p className="mt-2 font-display text-[30px]">{data.metrics.log_loss?.toFixed(3) ?? "—"}</p>
            </div>
            <div className="rounded-[18px] border-[2px] border-ink bg-white-warm p-4">
              <p className="eyebrow text-ink/45">field average</p>
              <p className="mt-2 font-display text-[30px]">{(data.summary.field_average * 100).toFixed(0)}%</p>
            </div>
            <div className="rounded-[18px] border-[2px] border-ink bg-white-warm p-4">
              <p className="eyebrow text-ink/45">spread</p>
              <p className="mt-2 font-display text-[30px]">{(data.summary.prediction_spread * 100).toFixed(0)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative bg-cream px-6 pb-16 text-ink md:px-10">
        <div className="mx-auto max-w-wide grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
          <div className="rounded-[26px] border-[2.5px] border-ink bg-white-warm p-4 md:p-6">
            <div className="grid grid-cols-[1.2fr_88px_1fr_0.9fr] gap-4 border-b border-ink/12 pb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/45">
              <span>Driver</span>
              <span>Grid</span>
              <span>Probability</span>
              <span>Top factors</span>
            </div>
            <div className="divide-y divide-ink/10">
              {data.drivers.map((driver) => (
                <div key={driver.driver} className="grid grid-cols-[1.2fr_88px_1fr_0.9fr] gap-4 py-4">
                  <div>
                    <p className="font-semibold">{driver.driver}</p>
                    <p className="text-[12px] text-ink/55">{driver.team}</p>
                    <p className="mt-1 text-[11px] text-ink/45">
                      finish {driver.finish_position ?? "—"} · {driver.actual ? "positive outcome" : "miss"}
                    </p>
                  </div>
                  <div className="text-[14px] font-semibold">{driver.grid_position ?? "—"}</div>
                  <div className="flex items-center gap-3">
                    <div className="relative h-3 flex-1 overflow-hidden rounded-full border border-ink/20 bg-[#f7f2ea]">
                      <div
                        className={`absolute inset-y-0 left-0 ${driver.actual ? "bg-mint" : "bg-[#d93e2b]"}`}
                        style={{ width: `${Math.max(4, Math.round(driver.p * 100))}%` }}
                      />
                    </div>
                    <span className="font-display text-[22px] tracking-tightest">
                      {(driver.p * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {driver.top_factors.map((factor) => (
                      <span
                        key={`${driver.driver}-${factor.feature}`}
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                          factor.value >= 0 ? "border-ink/20 bg-mint/35" : "border-ink/20 bg-[#f6d4ce]"
                        }`}
                        title={`${factor.feature}: ${factor.value.toFixed(2)}`}
                      >
                        {featureLabel(factor.feature)} {factor.value >= 0 ? "↑" : "↓"}
                        {Math.abs(factor.value).toFixed(2)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[26px] border-[2.5px] border-ink bg-[#efe7dc] p-5">
              <p className="eyebrow text-ink/55">Summary</p>
              <div className="mt-4 space-y-4 text-[14px] leading-relaxed text-ink/74">
                <p>
                  strongest driver <strong>{data.summary.top_driver.driver}</strong> for{" "}
                  <strong>{data.summary.top_driver.team}</strong> at{" "}
                  <strong>{(data.summary.top_driver.p * 100).toFixed(1)}%</strong>
                </p>
                <p>
                  strongest team signal <strong>{data.summary.strongest_team.team}</strong> averaging{" "}
                  <strong>{(data.summary.strongest_team.mean_p * 100).toFixed(1)}%</strong>
                </p>
                <p>
                  explanation type <strong>{data.drivers[0]?.explanation_kind ?? "—"}</strong>
                </p>
                <p className="text-ink/55">
                  export {data.model_version} · generated {data.generated_at}
                </p>
                <p className="text-[12px] text-ink/45">
                  Retrained after every F1 session via GitHub Actions — predictions republish automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
