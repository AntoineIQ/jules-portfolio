"""
Feature engineering for F1 points-finish prediction.

Every time-dependent feature is computed with a `shift(1)` so the row being
predicted never sees its own outcome. This is the single non-negotiable rule
of time-series modelling — see docs/learning/02-feature-engineering.md.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pandas as pd

from f1_prediction.evaluate import build_training_frame

PROJECT_ROOT = Path(__file__).resolve().parents[2]
QUALIFYING_DIR = PROJECT_ROOT / "data" / "raw" / "qualifying"
PRACTICE_DIR = PROJECT_ROOT / "data" / "raw" / "practice"

# ------------------------------------------------------------------------------
# Parsing helpers
# ------------------------------------------------------------------------------

QUALI_TIME_COLS: list[str] = ["Q1", "Q2", "Q3"]


def _quali_to_seconds(value: Any) -> float:
    """FastF1 stores quali times as pd.Timedelta; handle NaN and strings safely."""
    if value is None or pd.isna(value):
        return float("nan")
    if isinstance(value, pd.Timedelta):
        return value.total_seconds()
    try:
        return pd.to_timedelta(value).total_seconds()
    except (TypeError, ValueError):
        return float("nan")


# ------------------------------------------------------------------------------
# Frame enrichment
# ------------------------------------------------------------------------------


def load_practice(dir_: Path | None = None) -> pd.DataFrame:
    """
    Read the separately-ingested practice summaries and aggregate per
    (season, round, driver).

    Returns one row per (season, round, driver) with:
      - fp_best_seconds      : driver's fastest lap across any FP session
      - fp_long_run_seconds  : driver's longest valid long-run average across sessions
      - fp_total_laps        : total running (sum across sessions)

    These are the pace signals available BEFORE qualifying and race. They
    remain valid features for predicting quali_top10 and race_points; they
    do leak information into sprint predictions in sprint-format weekends
    where FP1 happens before the Sprint, so we still safely use FP1-only
    signals there.
    """
    root = Path(dir_) if dir_ else PRACTICE_DIR
    paths = sorted(root.glob("season=*/round=*/session=*.parquet"))
    if not paths:
        return pd.DataFrame(
            columns=[
                "season",
                "round",
                "driver",
                "fp_best_seconds",
                "fp_long_run_seconds",
                "fp_total_laps",
            ]
        )

    frames = [pd.read_parquet(p) for p in paths]
    all_fp = pd.concat(frames, ignore_index=True)
    agg = (
        all_fp.groupby(["season", "round", "driver"], as_index=False)
        .agg(
            fp_best_seconds=("best_lap_seconds", "min"),
            fp_long_run_seconds=("long_run_avg_seconds", "min"),
            fp_total_laps=("num_laps", "sum"),
        )
    )
    agg["season"] = agg["season"].astype(int)
    agg["round"] = agg["round"].astype(int)
    return agg


def load_qualifying(dir_: Path | None = None) -> pd.DataFrame:
    """
    Read the separately-ingested qualifying results and return one row per
    (driver, season, round) with that driver's best Q1/Q2/Q3 time in seconds.

    Empty DataFrame if no qualifying files have been ingested yet.
    """
    root = Path(dir_) if dir_ else QUALIFYING_DIR
    paths = sorted(root.glob("season=*/round=*.parquet"))
    if not paths:
        return pd.DataFrame(
            columns=["season", "round", "driver", "quali_best_seconds"]
        )
    frames = []
    for p in paths:
        q = pd.read_parquet(p)
        q_seconds = q[QUALI_TIME_COLS].map(_quali_to_seconds)
        frames.append(
            pd.DataFrame(
                {
                    "season": q["season"].astype(int),
                    "round": q["round"].astype(int),
                    "driver": q["Abbreviation"].astype(str),
                    "quali_best_seconds": q_seconds.min(axis=1).to_numpy(),
                }
            )
        )
    return pd.concat(frames, ignore_index=True)


def enrich_base_frame(
    raw: pd.DataFrame,
    qualifying: pd.DataFrame | None = None,
    practice: pd.DataFrame | None = None,
) -> pd.DataFrame:
    """
    Turn raw FastF1 results into a feature-ready base frame.

    Adds columns beyond build_training_frame: points_scored, quali_best_seconds,
    event_name, and practice-derived pace summaries. Qualifying and practice
    are joined from their separate Parquet files (populated by
    ingest.py's fetch_qualifying_results / fetch_practice_summary).
    """
    # Mirror build_training_frame's corrupt-row filter here so the downstream
    # columns we pull straight from `raw` stay aligned with `base`.
    grid_valid = pd.to_numeric(raw["GridPosition"], errors="coerce").replace(0, 20).notna()
    raw = raw[grid_valid].reset_index(drop=True)

    base = build_training_frame(raw)

    base["points_scored"] = (
        pd.to_numeric(raw["Points"], errors="coerce").fillna(0.0).to_numpy()
    )
    base["event_name"] = raw["event_name"].astype(str).to_numpy()

    q = qualifying if qualifying is not None else load_qualifying()
    base = base.merge(q, on=["season", "round", "driver"], how="left")

    fp = practice if practice is not None else load_practice()
    base = base.merge(fp, on=["season", "round", "driver"], how="left")

    return (
        base.sort_values(["event_date", "driver"])
        .reset_index(drop=True)
    )


# ------------------------------------------------------------------------------
# Per-race features (no time dimension issue — computed within one race)
# ------------------------------------------------------------------------------


def add_quali_gap(df: pd.DataFrame) -> pd.DataFrame:
    """For each (season, round), gap to the session's pole time in seconds."""
    df = df.copy()
    pole = df.groupby(["season", "round"])["quali_best_seconds"].transform("min")
    df["quali_gap_to_pole"] = df["quali_best_seconds"] - pole
    return df


def add_practice_gaps(df: pd.DataFrame) -> pd.DataFrame:
    """
    Per-race gaps to the best practice time. Two signals:
      - fp_best_gap_to_fastest     (short-run pace indicator)
      - fp_long_run_gap_to_fastest (long-run pace indicator — race-relevant)
    """
    df = df.copy()
    for col, out_col in [
        ("fp_best_seconds", "fp_best_gap_to_fastest"),
        ("fp_long_run_seconds", "fp_long_run_gap_to_fastest"),
    ]:
        if col in df.columns:
            fastest = df.groupby(["season", "round"])[col].transform("min")
            df[out_col] = df[col] - fastest
        else:
            df[out_col] = pd.NA
    return df


# ------------------------------------------------------------------------------
# Rolling / historical features (require chronological ordering + shift(1))
# ------------------------------------------------------------------------------


def _rolling_mean_before(s: pd.Series, window: int) -> pd.Series:
    """Rolling mean over the last `window` values, EXCLUDING the current row."""
    return s.shift(1).rolling(window=window, min_periods=1).mean()


def add_driver_features(df: pd.DataFrame) -> pd.DataFrame:
    """Rolling driver form: points and finish position over recent races."""
    df = df.sort_values(["driver", "event_date"]).reset_index(drop=True)
    g = df.groupby("driver", sort=False)
    df["driver_points_last_3"] = g["points_scored"].transform(
        lambda s: _rolling_mean_before(s, 3)
    )
    df["driver_points_last_5"] = g["points_scored"].transform(
        lambda s: _rolling_mean_before(s, 5)
    )
    df["driver_finish_last_3"] = g["finish_position"].transform(
        lambda s: _rolling_mean_before(s, 3)
    )
    return df


def add_track_history(df: pd.DataFrame) -> pd.DataFrame:
    """Driver's average finish at THIS circuit in prior appearances only."""
    df = df.sort_values(["driver", "event_name", "event_date"]).reset_index(drop=True)
    df["driver_track_history"] = (
        df.groupby(["driver", "event_name"], sort=False)["finish_position"]
        .transform(lambda s: s.shift(1).expanding().mean())
    )
    return df


def add_team_features(df: pd.DataFrame) -> pd.DataFrame:
    """Team average points per race over the team's last 3 races (both cars combined)."""
    team_race = (
        df.groupby(["team", "season", "round"], as_index=False)
        .agg(team_points=("points_scored", "sum"), event_date=("event_date", "first"))
        .sort_values(["team", "event_date"])
        .reset_index(drop=True)
    )
    team_race["team_points_last_3"] = (
        team_race.groupby("team", sort=False)["team_points"]
        .transform(lambda s: _rolling_mean_before(s, 3))
    )
    return df.merge(
        team_race[["team", "season", "round", "team_points_last_3"]],
        on=["team", "season", "round"],
        how="left",
    )


# ------------------------------------------------------------------------------
# Top-level builder
# ------------------------------------------------------------------------------


def build_features(
    raw: pd.DataFrame,
    qualifying: pd.DataFrame | None = None,
    practice: pd.DataFrame | None = None,
) -> pd.DataFrame:
    """
    Full pipeline: raw FastF1 results → enriched frame with engineered features.

    All time-dependent features use shift(1) / expanding history so no row
    sees its own outcome or any future row.
    """
    base = enrich_base_frame(raw, qualifying=qualifying, practice=practice)
    base = add_quali_gap(base)
    base = add_practice_gaps(base)
    base = add_driver_features(base)
    base = add_track_history(base)
    base = add_team_features(base)
    return base.sort_values(["event_date", "driver"]).reset_index(drop=True)


FEATURES: list[str] = [
    "grid_position",
    "quali_gap_to_pole",
    "driver_points_last_3",
    "driver_points_last_5",
    "driver_finish_last_3",
    "driver_track_history",
    "team_points_last_3",
]
