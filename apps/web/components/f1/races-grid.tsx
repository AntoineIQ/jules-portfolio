import { loadManifest, loadRaceData } from "@/lib/f1-data";
import Link from "next/link";

type RaceCard = {
  season: number;
  round: number;
  eventName: string;
  eventDate: string;
  topDriver: { driver: string; team: string; p: number };
  fieldAverage: number;
  hit: boolean | null;
};

export async function RacesGrid({ season }: { season: number }) {
  const manifest = await loadManifest();
  if (!manifest) return null;
  const rounds = (manifest.available_rounds[String(season)] ?? []).slice().sort((a, b) => a - b);
  if (rounds.length === 0) return null;

  const cards = (
    await Promise.all(
      rounds.map(async (round): Promise<RaceCard | null> => {
        const data = await loadRaceData(season, round, manifest.primary_target);
        if (!data) return null;
        const winner = data.drivers.find((d) => d.actual === 1 && d.finish_position === 1);
        const predicted = data.summary.top_driver;
        const hit = winner ? winner.driver === predicted.driver : null;
        return {
          season,
          round,
          eventName: data.event_name,
          eventDate: data.event_date,
          topDriver: predicted,
          fieldAverage: data.summary.field_average,
          hit,
        };
      }),
    )
  ).filter((c): c is RaceCard => c !== null);

  if (cards.length === 0) return null;

  return (
    <section className="relative bg-cream px-6 py-20 text-ink md:px-10 md:py-24">
      <div className="mx-auto max-w-wide">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow text-ink/50">§ Season {season}</span>
            <h2 className="mt-4 font-display uppercase text-display-md">Every race, every prediction.</h2>
          </div>
          <p className="max-w-[40ch] text-[14px] text-ink/60">
            Compact per-race summary for the {season} season using the primary target. Click any card for the full dossier with driver-level factors.
          </p>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((card) => (
            <Link
              key={card.round}
              href={`/projects/f1/race/${card.season}/${String(card.round).padStart(2, "0")}?target=race_points`}
              className="group relative flex flex-col rounded-[22px] border-[2px] border-ink bg-white-warm p-5 transition-transform hover:-translate-y-[2px]"
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-[18px] tabular-nums tracking-tightest text-ink/60">
                  R{String(card.round).padStart(2, "0")}
                </span>
                {card.hit === null ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/55">
                    <span className="h-[6px] w-[6px] rounded-full bg-ink/30" />
                    pending
                  </span>
                ) : card.hit ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/20 bg-mint/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]">
                    <span className="h-[6px] w-[6px] rounded-full bg-ink" />
                    hit
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/20 bg-[#f6d4ce] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]">
                    <span className="h-[6px] w-[6px] rounded-full bg-[#d93e2b]" />
                    miss
                  </span>
                )}
              </div>

              <h3 className="mt-4 font-display text-[18px] leading-tight tracking-tightest">
                {card.eventName}
              </h3>
              <p className="mt-1 text-[11px] text-ink/50">{card.eventDate}</p>

              <div className="mt-5 space-y-2 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-ink/55">Predicted winner</span>
                  <span className="font-semibold">{card.topDriver.driver}</span>
                </div>
                <div className="flex items-center justify-between text-ink/55">
                  <span>At</span>
                  <span className="tabular-nums">{(card.topDriver.p * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between text-ink/55">
                  <span>Field avg</span>
                  <span className="tabular-nums">{(card.fieldAverage * 100).toFixed(0)}%</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
