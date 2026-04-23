type Factor = { feature: string; value: number };

const FEATURE_LABELS: Record<string, string> = {
  grid_position: "grid position",
  quali_gap_to_pole: "quali gap to pole",
  driver_points_last_3: "driver form (last 3)",
  driver_points_last_5: "driver form (last 5)",
  driver_finish_last_3: "finish pattern",
  driver_track_history: "track history",
  team_points_last_3: "team form",
  circuit_finish_std: "circuit variance",
  circuit_grid_to_finish: "overtaking score",
  regulation_era: "regulation era",
  fp_best_gap_to_fastest: "FP best lap gap",
  fp_long_run_gap_to_fastest: "FP long-run gap",
  driver_quali_gap_last_3: "quali form",
  driver_quali_top10_rate_last_10: "Q3 appearance rate",
  sprint_grid_position: "sprint grid",
  grid_vs_teammate: "vs teammate grid",
  quali_gap_vs_teammate: "vs teammate quali",
};

export function FactorChart({
  driver,
  team,
  probability,
  factors,
  kind,
}: {
  driver: string;
  team: string;
  probability: number;
  factors: Factor[];
  kind?: string;
}) {
  const sorted = [...factors].sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 6);
  const maxAbs = Math.max(0.1, ...sorted.map((f) => Math.abs(f.value)));

  return (
    <figure
      className="rounded-[20px] border-[2px] border-ink bg-white-warm p-5"
      aria-label={`Feature breakdown for ${driver}`}
    >
      <figcaption className="flex items-baseline justify-between gap-4">
        <div>
          <p className="eyebrow text-ink/50">Top driver · factor breakdown</p>
          <p className="mt-2 font-display text-[22px] leading-tight tracking-tightest">
            {driver}
          </p>
          <p className="text-[12px] text-ink/55">{team}</p>
        </div>
        <div className="text-right">
          <p className="eyebrow text-ink/50">Probability</p>
          <p className="mt-1 font-display text-[28px] tabular-nums tracking-tightest">
            {(probability * 100).toFixed(0)}%
          </p>
        </div>
      </figcaption>

      <ul className="mt-5 space-y-2.5" role="list">
        {sorted.map((f) => {
          const pct = (f.value / maxAbs) * 50;
          const widthPct = Math.abs(pct);
          const isPositive = f.value >= 0;
          return (
            <li
              key={f.feature}
              className="grid grid-cols-[minmax(110px,max-content)_1fr_56px] items-center gap-3 text-[12px]"
            >
              <span className="truncate text-ink/75">
                {FEATURE_LABELS[f.feature] ?? f.feature}
              </span>
              <div className="relative h-5 rounded-full bg-[#f1ebdd]">
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-1/2 w-px bg-ink/20"
                />
                <span
                  aria-hidden
                  className={`absolute inset-y-[3px] rounded-full ${
                    isPositive ? "bg-mint" : "bg-f1-red"
                  }`}
                  style={{
                    left: isPositive ? "50%" : `${50 - widthPct}%`,
                    width: `${widthPct}%`,
                  }}
                />
              </div>
              <span className="text-right font-display tabular-nums text-[14px] tracking-tightest text-ink">
                {isPositive ? "+" : "−"}
                {Math.abs(f.value).toFixed(2)}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex items-center justify-between text-[10px] text-ink/45">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-[6px] w-[6px] rounded-full bg-f1-red" aria-hidden />
          pushes probability down
        </span>
        <span>{kind ?? "explanation"}</span>
        <span className="inline-flex items-center gap-1.5">
          pushes probability up
          <span className="h-[6px] w-[6px] rounded-full bg-mint" aria-hidden />
        </span>
      </div>
    </figure>
  );
}
