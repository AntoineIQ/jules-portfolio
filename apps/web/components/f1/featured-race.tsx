import { loadManifest, loadRaceData } from "@/lib/f1-data";
import { TargetSwitcher } from "./target-switcher";
import Link from "next/link";
import { ArrowDiagonal } from "@/components/decoration/arrow";

const ALL_TARGETS = [
  "race_points",
  "race_podium",
  "race_winner",
  "quali_top10",
  "h2h_beats_teammate",
  "sprint_points",
  "sprint_grid_top5",
];

export async function FeaturedRace() {
  const manifest = await loadManifest();
  if (!manifest) return null;

  const seasonKeys = Object.keys(manifest.available_rounds)
    .map(Number)
    .sort((a, b) => b - a);
  const latestSeason = seasonKeys[0];
  if (!latestSeason) return null;
  const rounds = manifest.available_rounds[String(latestSeason)] ?? [];
  const latestRound = rounds.length ? Math.max(...rounds) : null;
  if (latestRound === null) return null;

  const bundles = (
    await Promise.all(
      ALL_TARGETS.map(async (target) => {
        const data = await loadRaceData(latestSeason, latestRound, target);
        return data ? { target, data } : null;
      }),
    )
  ).filter((b): b is { target: string; data: NonNullable<Awaited<ReturnType<typeof loadRaceData>>> } => b !== null);

  if (bundles.length === 0) return null;

  const eventName = bundles[0].data.event_name;
  const eventDate = bundles[0].data.event_date;

  return (
    <section className="relative bg-[#0e0e10] px-6 py-20 text-cream md:px-10 md:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(255,255,255,0.5) 0 14px, transparent 14px 28px)",
        }}
      />
      <div className="relative mx-auto grid max-w-wide gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="relative flex h-[10px] w-[10px]">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#d93e2b] opacity-60" />
              <span className="relative inline-flex h-[10px] w-[10px] rounded-full bg-[#d93e2b]" />
            </span>
            <span className="eyebrow text-cream/60">Latest race · Round {String(latestRound).padStart(2, "0")} · {latestSeason}</span>
          </div>
          <h2 className="mt-6 font-display uppercase text-hero-md text-yellow">
            {eventName}.
          </h2>
          <p className="mt-5 max-w-[50ch] text-[16px] leading-relaxed text-cream/75">
            Flip through every target the model predicts — race points, podium, win, qualifying, sprint, head-to-head. The ranking below shows the top ten probabilities, colour-coded by whether the model got it right.
          </p>
          <p className="mt-5 max-w-[50ch] text-[13px] leading-relaxed text-cream/45">
            Race date {eventDate}. The pipeline will start pre-publishing predictions ahead of each session in a later pass — for now this shows the freshest race in the held-out set.
          </p>
          <Link
            href={`/projects/f1/race/${latestSeason}/${String(latestRound).padStart(2, "0")}?target=race_points`}
            className="group mt-10 inline-flex items-center gap-3 rounded-full border-[2px] border-cream/40 bg-cream/5 px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-cream transition-colors hover:border-cream hover:bg-cream/10"
          >
            Full dossier
            <ArrowDiagonal className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
        <div className="text-ink">
          <TargetSwitcher bundles={bundles} />
        </div>
      </div>
    </section>
  );
}
