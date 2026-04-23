import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowBack } from "@/components/decoration/arrow";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { loadManifest, loadRaceData } from "@/lib/f1-data";
import { FactorChart } from "@/components/f1/factor-chart";

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

  const seasons = Object.keys(manifest.available_rounds)
    .map(Number)
    .sort((a, b) => a - b);
  const roundsForSeason = (manifest.available_rounds[String(season)] ?? []).slice().sort((a, b) => a - b);
  const currentRoundIndex = roundsForSeason.indexOf(round);
  const prevRound = currentRoundIndex > 0 ? roundsForSeason[currentRoundIndex - 1] : null;
  const nextRound =
    currentRoundIndex >= 0 && currentRoundIndex < roundsForSeason.length - 1
      ? roundsForSeason[currentRoundIndex + 1]
      : null;

  const top = [...data.drivers].sort((a, b) => b.p - a.p)[0] ?? data.drivers[0];
  const ranking = [...data.drivers].sort((a, b) => b.p - a.p);

  return (
    <>
      <section className="relative bg-cream px-6 pb-8 pt-28 text-ink md:px-10 md:pt-32">
        <div className="mx-auto max-w-wide">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-3 text-[12px] text-ink/55">
            <Link href="/projects" className="group inline-flex items-center gap-2 press-scale hover:text-ink">
              <ArrowBack className="h-[12px] w-[32px] transition-transform duration-300 group-hover:-translate-x-1" />
              <span className="eyebrow">All projects</span>
            </Link>
            <span aria-hidden className="text-ink/25">/</span>
            <Link href="/projects/f1" className="eyebrow text-ink/55 hover:text-ink">F1 project</Link>
            <span aria-hidden className="text-ink/25">/</span>
            <span className="eyebrow text-ink/75">Race dossier</span>
          </nav>

          <div className="mt-8 flex flex-wrap items-center gap-2">
            <span className="eyebrow text-ink/45">Season</span>
            {seasons.map((s) => {
              const seasonRounds = manifest.available_rounds[String(s)] ?? [];
              const targetRound = seasonRounds.includes(round)
                ? round
                : seasonRounds[seasonRounds.length - 1] ?? 1;
              return (
                <Link
                  key={s}
                  href={`/projects/f1/race/${s}/${String(targetRound).padStart(2, "0")}?target=${target}`}
                  aria-current={s === season ? "page" : undefined}
                  className={`rounded-full border-[1.5px] px-3 py-1 text-[12px] font-semibold tabular-nums transition-colors ${
                    s === season
                      ? "border-ink bg-ink text-cream"
                      : "border-ink/20 bg-cream text-ink/65 hover:border-ink/60 hover:text-ink"
                  }`}
                >
                  {s}
                </Link>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="eyebrow text-ink/45 mr-2">Round</span>
            {roundsForSeason.map((r) => (
              <Link
                key={r}
                href={`/projects/f1/race/${season}/${String(r).padStart(2, "0")}?target=${target}`}
                aria-current={r === round ? "page" : undefined}
                className={`min-w-[34px] rounded-md border px-2 py-1 text-center text-[11px] font-semibold tabular-nums transition-colors ${
                  r === round
                    ? "border-f1-red bg-f1-red text-cream"
                    : "border-ink/15 bg-white-warm text-ink/60 hover:border-ink/40 hover:text-ink"
                }`}
              >
                {String(r).padStart(2, "0")}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="relative bg-cream px-6 pb-8 text-ink md:px-10">
        <div className="mx-auto max-w-wide">
          <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <span className="eyebrow text-ink/55">
                § Round {String(round).padStart(2, "0")} · {season}
              </span>
              <h1 className="mt-3 font-display uppercase text-display-md">{data.event_name}.</h1>
              <p className="mt-2 text-[13px] text-ink/55 tabular-nums">
                {data.event_date} · {data.metrics.n} drivers · held-out evaluation
              </p>
            </div>
            <div className="flex items-center gap-2">
              {prevRound ? (
                <Link
                  href={`/projects/f1/race/${season}/${String(prevRound).padStart(2, "0")}?target=${target}`}
                  className="inline-flex h-9 items-center gap-2 rounded-full border-[1.5px] border-ink/20 bg-white-warm px-3 text-[12px] font-semibold hover:border-ink"
                >
                  ← R{String(prevRound).padStart(2, "0")}
                </Link>
              ) : null}
              {nextRound ? (
                <Link
                  href={`/projects/f1/race/${season}/${String(nextRound).padStart(2, "0")}?target=${target}`}
                  className="inline-flex h-9 items-center gap-2 rounded-full border-[1.5px] border-ink/20 bg-white-warm px-3 text-[12px] font-semibold hover:border-ink"
                >
                  R{String(nextRound).padStart(2, "0")} →
                </Link>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {Object.entries(manifest.targets).map(([name, entry]) => (
              <Link
                key={name}
                href={`/projects/f1/race/${season}/${String(round).padStart(2, "0")}?target=${name}`}
                aria-current={name === target ? "page" : undefined}
                className={`rounded-full border-[1.5px] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors ${
                  name === target
                    ? "border-ink bg-f1-red text-cream"
                    : "border-ink/15 bg-white-warm text-ink/65 hover:border-ink/40 hover:text-ink"
                }`}
              >
                {entry.display.replace(/^Race — /, "").replace(/^Quali — /, "Q: ").replace(/^Sprint — /, "S: ").replace(/^H2H — /, "H2H: ")}
              </Link>
            ))}
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
            {[
              { label: "log-loss", value: data.metrics.log_loss?.toFixed(3) ?? "—" },
              { label: "brier", value: data.metrics.brier?.toFixed(3) ?? "—" },
              { label: "ECE", value: data.metrics.ece?.toFixed(3) ?? "—" },
              { label: "field avg", value: `${(data.summary.field_average * 100).toFixed(0)}%` },
              { label: "spread", value: (data.summary.prediction_spread * 100).toFixed(0) },
            ].map((m) => (
              <div key={m.label} className="rounded-[14px] border border-ink/12 bg-white-warm px-4 py-3">
                <dt className="eyebrow text-ink/45">{m.label}</dt>
                <dd className="mt-1 font-display text-[22px] tabular-nums tracking-tightest">{m.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="relative bg-cream px-6 pb-20 text-ink md:px-10">
        <div className="mx-auto max-w-wide">
          <ScrollReveal>
            <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr] lg:items-start">
              <div className="overflow-hidden rounded-[20px] border-[2px] border-ink bg-white-warm">
                <div className="flex items-center justify-between border-b border-ink/10 px-5 py-3">
                  <p className="eyebrow text-ink/55">Driver ranking</p>
                  <p className="text-[11px] text-ink/45">
                    coloured by outcome · <span className="inline-flex items-center gap-1">
                      <span className="h-[6px] w-[6px] rounded-full bg-mint" aria-hidden /> hit
                    </span>{" "}
                    ·{" "}
                    <span className="inline-flex items-center gap-1">
                      <span className="h-[6px] w-[6px] rounded-full bg-f1-red" aria-hidden /> miss
                    </span>
                  </p>
                </div>
                <ol className="divide-y divide-ink/8">
                  {ranking.map((driver, idx) => {
                    const hit = driver.actual === 1;
                    const widthPct = Math.max(4, Math.round(driver.p * 100));
                    return (
                      <li
                        key={driver.driver}
                        className="grid grid-cols-[32px_120px_1fr_60px_52px] items-center gap-3 px-5 py-2.5 text-[12px]"
                      >
                        <span className="font-display text-[14px] tabular-nums text-ink/50">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{driver.driver}</p>
                          <p className="truncate text-[10px] text-ink/50">{driver.team}</p>
                        </div>
                        <div className="relative h-2.5 overflow-hidden rounded-full bg-[#efe7dc]">
                          <div
                            className={`absolute inset-y-0 left-0 ${hit ? "bg-mint" : "bg-f1-red"}`}
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                        <span className="text-right font-display text-[14px] tabular-nums tracking-tightest text-ink">
                          {(driver.p * 100).toFixed(0)}%
                        </span>
                        <span className="text-right text-[10px] tabular-nums text-ink/45">
                          grid {driver.grid_position ?? "—"}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>

              <div className="space-y-5">
                {top ? (
                  <FactorChart
                    driver={top.driver}
                    team={top.team}
                    probability={top.p}
                    factors={top.top_factors}
                    kind={top.explanation_kind}
                  />
                ) : null}

                <div className="rounded-[20px] border border-ink/12 bg-white-warm p-5">
                  <p className="eyebrow text-ink/55">Summary</p>
                  <div className="mt-4 space-y-3 text-[13px] leading-relaxed text-ink/72">
                    <p>
                      Strongest signal on <strong>{data.summary.top_driver.driver}</strong>{" "}
                      ({data.summary.top_driver.team}) at{" "}
                      <strong className="tabular-nums">{(data.summary.top_driver.p * 100).toFixed(1)}%</strong>.
                    </p>
                    <p>
                      Strongest team average:{" "}
                      <strong>{data.summary.strongest_team.team}</strong>{" "}
                      <span className="tabular-nums">
                        {(data.summary.strongest_team.mean_p * 100).toFixed(1)}%
                      </span>.
                    </p>
                    <p className="text-[11px] text-ink/50">
                      Export <span className="tabular-nums">{data.model_version}</span> · generated{" "}
                      <span className="tabular-nums">{data.generated_at}</span>. Republished automatically after every F1 session.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>

          <div className="mt-10 flex items-center justify-between gap-4 border-t border-ink/10 pt-6">
            <Link
              href="/projects/f1"
              className="group inline-flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.18em] press-scale"
            >
              <ArrowBack className="h-[12px] w-[32px] transition-transform duration-300 group-hover:-translate-x-1" />
              Back to F1 project
            </Link>
            <span className="eyebrow text-ink/45">
              {data.target_display}
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
