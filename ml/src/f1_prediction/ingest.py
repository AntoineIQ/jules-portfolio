"""
Fetch F1 race results via FastF1 and save to Parquet.

Usage:
    uv run python -m f1_prediction.ingest --year 2024
    uv run python -m f1_prediction.ingest --year 2022 --year 2023 --year 2024

Output layout:
    data/raw/results/season=<year>/round=<round>.parquet

Each Parquet file contains the classified race results for one Grand Prix.
"""

from __future__ import annotations

import logging
import time
from pathlib import Path

import fastf1
import pandas as pd
import typer

# Small delay between FastF1 session fetches to stay under Ergast's rate limit.
# Without this, batch ingests occasionally get 429 Too Many Requests which
# surfaces as silently-NaT qualifying times. 2 seconds is plenty and barely
# adds time to real-world runs (a full season is ~90 seconds vs ~60 without).
INTER_FETCH_SLEEP_SECONDS = 2.0

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data"
CACHE_DIR = DATA_DIR / "cache"
RAW_DIR = DATA_DIR / "raw"
RESULTS_DIR = RAW_DIR / "results"
QUALIFYING_DIR = RAW_DIR / "qualifying"
SPRINT_DIR = RAW_DIR / "sprint"
PRACTICE_DIR = RAW_DIR / "practice"


def _ensure_cache() -> None:
    """Point FastF1 at a project-local cache so CI runs can persist it."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    fastf1.Cache.enable_cache(str(CACHE_DIR))


def _results_path(year: int, round_number: int) -> Path:
    return RESULTS_DIR / f"season={year}" / f"round={round_number:02d}.parquet"


def _qualifying_path(year: int, round_number: int) -> Path:
    return QUALIFYING_DIR / f"season={year}" / f"round={round_number:02d}.parquet"


def _sprint_path(year: int, round_number: int) -> Path:
    return SPRINT_DIR / f"season={year}" / f"round={round_number:02d}.parquet"


def _practice_path(year: int, round_number: int, session_code: str) -> Path:
    return (
        PRACTICE_DIR
        / f"season={year}"
        / f"round={round_number:02d}"
        / f"session={session_code}.parquet"
    )


def _fetch_session(year: int, round_number: int, session_code: str, event_name: str) -> pd.DataFrame | None:
    """Load one session (R, Q, Sprint, etc.) and return its classified results DataFrame."""
    try:
        session = fastf1.get_session(year, round_number, session_code)
        session.load(laps=False, telemetry=False, weather=False, messages=False)
    except Exception as exc:  # noqa: BLE001 — FastF1 raises various upstream errors
        logger.warning(
            "Skipping %s %s round %s (%s): %s", session_code, year, round_number, event_name, exc
        )
        return None

    results = session.results
    if results is None or len(results) == 0:
        return None

    df = results.copy()
    df["season"] = year
    df["round"] = round_number
    df["event_name"] = event_name
    df["event_date"] = pd.Timestamp(session.event["EventDate"]).normalize()
    return df


def fetch_race_results(year: int, round_number: int, event_name: str) -> pd.DataFrame | None:
    """Classified race results for one Grand Prix."""
    return _fetch_session(year, round_number, "R", event_name)


def fetch_qualifying_results(year: int, round_number: int, event_name: str) -> pd.DataFrame | None:
    """
    Qualifying session results including Q1/Q2/Q3 lap times.

    We need this because session.results from a Race session does NOT populate
    Q1/Q2/Q3 — those only appear when the Qualifying session is loaded.
    """
    return _fetch_session(year, round_number, "Q", event_name)


def fetch_sprint_results(year: int, round_number: int, event_name: str) -> pd.DataFrame | None:
    """Sprint race classified results. Only 6 weekends per year have sprints."""
    return _fetch_session(year, round_number, "Sprint", event_name)


def fetch_practice_summary(
    year: int,
    round_number: int,
    event_name: str,
    session_code: str,  # 'FP1', 'FP2', 'FP3', or 'Practice 1' / 'Practice 2' / 'Practice 3'
) -> pd.DataFrame | None:
    """
    Load a Free Practice session and return a per-driver summary.

    Unlike Race / Qualifying, Practice sessions are not 'classified', so
    session.results is mostly empty. We instead load the laps and compute:
      - best_lap_seconds  : fastest clean lap of the driver in this session
      - num_laps          : total laps driven (running proxy)
      - long_run_avg      : mean of their longest clean stint (≥3 consecutive
                            racing laps, pit in/out laps excluded)

    Returns None if the session doesn't exist or no laps were set.
    """
    try:
        session = fastf1.get_session(year, round_number, session_code)
        session.load(laps=True, telemetry=False, weather=False, messages=False)
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Skipping %s %s R%s %s: %s",
            session_code, year, round_number, event_name, exc,
        )
        return None

    laps = session.laps
    if laps is None or len(laps) == 0:
        return None

    # Driver list
    drivers = laps["Driver"].dropna().unique()
    rows = []
    for drv in drivers:
        drv_laps = laps[laps["Driver"] == drv]
        if drv_laps.empty:
            continue
        valid = drv_laps[drv_laps["LapTime"].notna()]
        if valid.empty:
            continue

        best_lap_td = valid["LapTime"].min()
        best_lap = float(best_lap_td.total_seconds()) if pd.notna(best_lap_td) else float("nan")
        num_laps = int(len(drv_laps))

        # Long-run average: longest stretch of ≥3 consecutive racing laps, excluding in/out laps.
        long_run_avg = _long_run_pace(drv_laps)

        team = drv_laps["Team"].dropna().iloc[0] if drv_laps["Team"].notna().any() else None
        rows.append(
            {
                "driver": drv,
                "team": team,
                "best_lap_seconds": best_lap,
                "num_laps": num_laps,
                "long_run_avg_seconds": long_run_avg,
            }
        )

    if not rows:
        return None

    df = pd.DataFrame(rows)
    df["season"] = year
    df["round"] = round_number
    df["event_name"] = event_name
    df["session"] = session_code
    df["event_date"] = pd.Timestamp(session.event["EventDate"]).normalize()
    return df


def _long_run_pace(drv_laps: pd.DataFrame, min_run_length: int = 3) -> float:
    """
    Average lap time of the driver's longest valid consecutive stint, in seconds.
    Excludes pit-in / pit-out laps. Returns NaN if no qualifying stint exists.
    """
    # Drop laps with NaT lap time or pit in/out laps
    clean = drv_laps[
        drv_laps["LapTime"].notna()
        & drv_laps["PitInTime"].isna()
        & drv_laps["PitOutTime"].isna()
    ].sort_values("LapNumber")
    if len(clean) < min_run_length:
        return float("nan")

    # Find runs of consecutive LapNumbers
    best_run_mean = float("nan")
    best_run_length = 0
    current: list[float] = []
    prev_lap_num: int | None = None
    for _, row in clean.iterrows():
        lap_num = int(row["LapNumber"])
        lap_time = float(row["LapTime"].total_seconds())
        if prev_lap_num is not None and lap_num != prev_lap_num + 1:
            if len(current) >= min_run_length and len(current) > best_run_length:
                best_run_length = len(current)
                best_run_mean = float(sum(current) / len(current))
            current = []
        current.append(lap_time)
        prev_lap_num = lap_num
    if len(current) >= min_run_length and len(current) > best_run_length:
        best_run_mean = float(sum(current) / len(current))

    return best_run_mean


def ingest_season(
    year: int,
    qualifying: bool = True,
    sprint: bool = True,
    practice: bool = True,
) -> int:
    """
    Fetch all completed sessions for one season.

    For every event in the schedule, pull the Race; optionally Qualifying;
    and optionally Sprint + Sprint Qualifying where those sessions exist
    (6-ish weekends per year in the sprint era). Writes one Parquet per
    (session, event).

    Returns count of race files written (used as a proxy for "events processed").
    """
    schedule = fastf1.get_event_schedule(year, include_testing=False)
    written_races = 0
    for _, event in schedule.iterrows():
        round_number = int(event["RoundNumber"])
        event_name = str(event["EventName"])
        logger.info("Fetching %s round %s — %s", year, round_number, event_name)

        race_df = fetch_race_results(year, round_number, event_name)
        if race_df is None:
            continue

        race_path = _results_path(year, round_number)
        race_path.parent.mkdir(parents=True, exist_ok=True)
        race_df.to_parquet(race_path, index=False)
        written_races += 1

        if qualifying:
            time.sleep(INTER_FETCH_SLEEP_SECONDS)
            q_df = fetch_qualifying_results(year, round_number, event_name)
            if q_df is not None:
                # Skip writing if Q1/Q2/Q3 all came back NaT (Ergast hiccup).
                all_nat = q_df[["Q1", "Q2", "Q3"]].isna().all(axis=1).all()
                if not all_nat:
                    q_path = _qualifying_path(year, round_number)
                    q_path.parent.mkdir(parents=True, exist_ok=True)
                    q_df.to_parquet(q_path, index=False)
                else:
                    logger.warning(
                        "Qualifying for %s R%s (%s) came back all-NaT — skipped.",
                        year, round_number, event_name,
                    )

        if sprint:
            # Only fetch the Sprint race session. Sprint Qualifying is not
            # reliably exposed by FastF1/Ergast (all Q1/Q2/Q3 come back NaT)
            # so we skip it — sprint qualifying outcome is captured by the
            # Sprint session's GridPosition column anyway.
            time.sleep(INTER_FETCH_SLEEP_SECONDS)
            sprint_df = fetch_sprint_results(year, round_number, event_name)
            if sprint_df is not None:
                sp_path = _sprint_path(year, round_number)
                sp_path.parent.mkdir(parents=True, exist_ok=True)
                sprint_df.to_parquet(sp_path, index=False)

        if practice:
            # Free-practice sessions. Conventional weekends have FP1/FP2/FP3;
            # sprint weekends (2024+) only have FP1. We try all three and
            # accept None silently for sessions that don't exist.
            for fp_code in ("FP1", "FP2", "FP3"):
                time.sleep(INTER_FETCH_SLEEP_SECONDS)
                fp_df = fetch_practice_summary(year, round_number, event_name, fp_code)
                if fp_df is not None:
                    fp_path = _practice_path(year, round_number, fp_code)
                    fp_path.parent.mkdir(parents=True, exist_ok=True)
                    fp_df.to_parquet(fp_path, index=False)

    logger.info("Season %s: wrote %s race result files to %s", year, written_races, RAW_DIR)
    return written_races


app = typer.Typer(add_completion=False, help=__doc__)


@app.command()
def main(
    year: list[int] = typer.Option(  # noqa: B008 — typer pattern
        [2024],
        "--year",
        "-y",
        help="Season(s) to ingest. Repeat flag for multiple years.",
    ),
) -> None:
    """Ingest F1 race results for one or more seasons."""
    _ensure_cache()
    total = 0
    for y in year:
        total += ingest_season(y)
    logger.info("Ingestion complete. Wrote %s files across %s seasons.", total, len(year))


if __name__ == "__main__":
    app()
