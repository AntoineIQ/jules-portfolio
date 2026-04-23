"use client";

import { useState } from "react";

type LiveResponse = {
  model_version: string;
  generated_at: string;
  summary: {
    top_driver: { driver: string; team: string; p: number };
    strongest_team: { team: string; mean_p: number };
    field_average: number;
    prediction_spread: number;
  };
  drivers: Array<{
    driver: string;
    team: string;
    p: number;
    actual: 0 | 1 | null;
    top_factors: { feature: string; value: number }[];
  }>;
};

function factorLabel(feature: string) {
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

export function LiveRaceProbe({
  season,
  round,
  target,
}: {
  season: number;
  round: number;
  target: string;
}) {
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    data: LiveResponse | null;
  }>({ loading: false, error: null, data: null });

  async function run() {
    try {
      setState({ loading: true, error: null, data: null });
      const response = await fetch("/api/f1/predict/race", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ season, round, target }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(payload?.detail ?? "Live model request failed");
      }
      const data = (await response.json()) as LiveResponse;
      setState({ loading: false, error: null, data });
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : "Live model request failed",
        data: null,
      });
    }
  }

  return (
    <div className="rounded-[24px] border-[2.5px] border-ink bg-white-warm p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-ink/55">Live model probe</p>
          <p className="mt-2 max-w-[52ch] text-[14px] leading-relaxed text-ink/70">
            Calls the current production model through the Python API. This is the live inference surface, separate from the historical held-out evaluation above.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          className="rounded-full border-2 border-ink bg-[#d93e2b] px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-white transition-transform hover:-translate-y-[1px] active:scale-[0.98]"
        >
          {state.loading ? "Running…" : "Run live model"}
        </button>
      </div>

      {state.error ? (
        <div className="mt-4 rounded-[16px] border border-[#d93e2b]/30 bg-[#fff1ef] px-4 py-3 text-[13px] text-[#8a2317]">
          {state.error}
        </div>
      ) : null}

      {state.data ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[18px] border border-ink/12 bg-[#f7f2ea] p-4">
            <p className="eyebrow text-ink/55">Snapshot</p>
            <div className="mt-3 space-y-3 text-[13px]">
              <p>
                top driver <strong>{state.data.summary.top_driver.driver}</strong> at{" "}
                <strong>{(state.data.summary.top_driver.p * 100).toFixed(1)}%</strong>
              </p>
              <p>
                strongest team <strong>{state.data.summary.strongest_team.team}</strong> averaging{" "}
                <strong>{(state.data.summary.strongest_team.mean_p * 100).toFixed(1)}%</strong>
              </p>
              <p>
                field average <strong>{(state.data.summary.field_average * 100).toFixed(1)}%</strong>
              </p>
              <p>
                spread <strong>{(state.data.summary.prediction_spread * 100).toFixed(1)} pts</strong>
              </p>
              <p className="text-ink/55">
                model {state.data.model_version} · updated {state.data.generated_at}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {state.data.drivers.slice(0, 5).map((driver) => (
              <div key={driver.driver} className="rounded-[18px] border border-ink/12 bg-[#f7f2ea] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{driver.driver}</p>
                    <p className="text-[12px] text-ink/55">{driver.team}</p>
                  </div>
                  <p className="font-display text-[24px] tracking-tightest">
                    {(driver.p * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {driver.top_factors.map((factor) => (
                    <span
                      key={`${driver.driver}-${factor.feature}`}
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                        factor.value >= 0 ? "border-ink/25 bg-mint/40" : "border-ink/20 bg-[#f6d4ce]"
                      }`}
                    >
                      {factorLabel(factor.feature)} {factor.value >= 0 ? "↑" : "↓"}
                      {Math.abs(factor.value).toFixed(2)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
