import Link from "next/link";
import { Fragment } from "react";
import { circuitCode, type SeasonPayload } from "@/lib/f1-types";

function cellColor(p: number, actual: 0 | 1): string {
  if (actual === 1) {
    return `rgba(127, 227, 185, ${(0.35 + p * 0.55).toFixed(2)})`;
  }
  return `rgba(217, 62, 43, ${(0.1 + p * 0.65).toFixed(2)})`;
}

export function SeasonMatrixFallback({
  data,
  target,
}: {
  data: SeasonPayload;
  target: string;
}) {
  const byKey = new Map(data.cells.map((cell) => [`${cell.driver}|${cell.round}`, cell]));

  return (
    <div className="rounded-[24px] border-[2.5px] border-ink bg-[#f7f2ea] p-4 md:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-ink/55">Fallback matrix</p>
          <h3 className="mt-2 font-display text-[28px] uppercase tracking-tightest leading-[0.92]">
            {data.target_display}
          </h3>
        </div>
        <div className="flex gap-4 text-[13px]">
          <span>
            log-loss <strong>{data.metrics.log_loss?.toFixed(3) ?? "—"}</strong>
          </span>
          <span>
            brier <strong>{data.metrics.brier?.toFixed(3) ?? "—"}</strong>
          </span>
          <span>
            ECE <strong>{data.metrics.ece?.toFixed(3) ?? "—"}</strong>
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div
          className="grid min-w-max gap-[3px]"
          style={{
            gridTemplateColumns: `140px repeat(${data.races.length}, minmax(28px, 1fr))`,
          }}
        >
          <div className="eyebrow text-ink/55">driver / race</div>
          {data.races.map((race) => (
            <div
              key={race.round}
              className="eyebrow text-center text-ink/65"
              title={`${race.event_name} · ${race.event_date}`}
            >
              {circuitCode(race.event_name, race.round)}
            </div>
          ))}

          {data.drivers.map((driver) => (
            <Fragment key={driver.driver}>
              <div
                className="flex items-center gap-2 border-t border-ink/10 py-1 text-[12px] font-semibold"
              >
                <span>{driver.driver}</span>
                <span className="text-[10px] font-medium text-ink/45">{driver.team}</span>
              </div>
              {data.races.map((race) => {
                const cell = byKey.get(`${driver.driver}|${race.round}`);
                if (!cell) {
                  return (
                    <div
                      key={`${driver.driver}-${race.round}`}
                      className="h-6 rounded-[4px] border border-ink/10 bg-white/70"
                    />
                  );
                }
                return (
                  <Link
                    key={`${driver.driver}-${race.round}`}
                    href={`/projects/f1/race/${data.season}/${race.round}?target=${target}`}
                    className="h-6 rounded-[4px] border border-ink/20 transition-transform hover:scale-105"
                    style={{ backgroundColor: cellColor(cell.p, cell.actual) }}
                  title={`${driver.driver} · ${(cell.p * 100).toFixed(0)}%`}
                />
              );
            })}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
