"use client";

import { useState, useMemo } from "react";
import type { RacePayload } from "@/lib/f1-types";

type TargetBundle = {
  target: string;
  data: RacePayload;
};

export function TargetSwitcher({ bundles }: { bundles: TargetBundle[] }) {
  const [active, setActive] = useState(bundles[0]?.target);
  const current = useMemo(
    () => bundles.find((b) => b.target === active) ?? bundles[0],
    [active, bundles],
  );

  if (!current) return null;

  const drivers = [...current.data.drivers].sort((a, b) => b.p - a.p).slice(0, 10);
  const topP = drivers[0]?.p ?? 1;

  return (
    <div className="rounded-[28px] border-[2.5px] border-ink bg-white-warm p-5 md:p-8">
      <div className="flex flex-wrap gap-2">
        {bundles.map((b) => {
          const isActive = b.target === active;
          return (
            <button
              key={b.target}
              type="button"
              onClick={() => setActive(b.target)}
              className={`rounded-full border-[2px] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.14em] transition-colors ${
                isActive
                  ? "border-ink bg-[#d93e2b] text-white"
                  : "border-ink/20 bg-white-warm text-ink/70 hover:border-ink/50"
              }`}
            >
              {b.data.target_display.replace(/^Race — /, "").replace(/^Quali — /, "Q: ").replace(/^Sprint — /, "S: ").replace(/^H2H — /, "H2H: ")}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-4 border-t border-ink/10 pt-5">
        <div>
          <p className="eyebrow text-ink/50">Target</p>
          <p className="mt-1 font-display text-[22px] leading-tight tracking-tightest">
            {current.data.target_display}
          </p>
        </div>
        <div className="flex flex-wrap gap-5 text-[12px] tabular-nums text-ink/60">
          <span>
            log-loss <strong className="text-ink">{current.data.metrics.log_loss?.toFixed(3) ?? "—"}</strong>
          </span>
          <span>
            field-avg <strong className="text-ink">{(current.data.summary.field_average * 100).toFixed(0)}%</strong>
          </span>
          <span>
            spread <strong className="text-ink">{(current.data.summary.prediction_spread * 100).toFixed(0)}</strong>
          </span>
        </div>
      </div>

      <ol className="mt-6 space-y-2">
        {drivers.map((d, idx) => {
          const widthPct = Math.max(4, (d.p / Math.max(topP, 0.01)) * 100);
          const hit = d.actual === 1;
          return (
            <li
              key={d.driver}
              className="grid grid-cols-[28px_140px_1fr_64px] items-center gap-3 rounded-[14px] px-3 py-2.5 text-[13px] odd:bg-[#f7f2ea]/60"
            >
              <span className="font-display text-[14px] tabular-nums text-ink/50">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold">{d.driver}</p>
                <p className="truncate text-[11px] text-ink/55">{d.team}</p>
              </div>
              <div className="relative h-3 overflow-hidden rounded-full border border-ink/15 bg-[#efe7dc]">
                <div
                  className={`absolute inset-y-0 left-0 transition-[width] duration-500 ease-out ${
                    hit ? "bg-mint" : "bg-[#d93e2b]"
                  }`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <span className="text-right font-display text-[18px] tabular-nums tracking-tightest">
                {(d.p * 100).toFixed(0)}%
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-4 text-[11px] text-ink/55">
        <span className="inline-flex items-center gap-2">
          <span className="h-[8px] w-[8px] rounded-full bg-mint" aria-hidden /> hit
          <span className="ml-3 h-[8px] w-[8px] rounded-full bg-[#d93e2b]" aria-hidden /> miss
        </span>
        <span>
          model {current.data.model_version} · {current.data.generated_at}
        </span>
      </div>
    </div>
  );
}
