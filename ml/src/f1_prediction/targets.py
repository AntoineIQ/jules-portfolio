"""
Multi-target prediction — targets, labels, and the unified training frame.

Four targets are defined. Each has:
  - a `label_*` column produced by `build_multi_target_frame()`
  - a list of features that the model should use
  - a human-readable `display` string for the UI

The non-trivial step is layering labels from *different* sessions into one frame:
  - race → label_race_points
  - qualifying → label_quali_top10
  - sprint → label_sprint_points + label_sprint_grid_top5
                + the sprint_grid_position feature

Sprint-related labels are NaN for weekends without a sprint (most weekends).
Downstream training code drops rows where the target label is NaN.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

from f1_prediction.evaluate import load_results
from f1_prediction.features import build_features


PROJECT_ROOT = Path(__file__).resolve().parents[2]
QUALIFYING_DIR = PROJECT_ROOT / "data" / "raw" / "qualifying"
SPRINT_DIR = PROJECT_ROOT / "data" / "raw" / "sprint"


# ---- Target definitions ------------------------------------------------------

BASE_FEATURES: list[str] = [
    "driver_points_last_3",
    "driver_points_last_5",
    "driver_finish_last_3",
    "driver_track_history",
    "team_points_last_3",
    # Circuit-level features — same value for all 20 drivers at a given race,
    # computed from 2014+ race history. Era-independent: circuit geometry
    # doesn't change across regulation cuts.
    "circuit_finish_std",
    "circuit_grid_to_finish",
    # Regulation-era encoder — lets tree splits separate "old rules" from
    # "new rules" without us having to manually filter training data.
    "regulation_era",
]


@dataclass(frozen=True)
class Target:
    name: str
    display: str
    label_col: str
    features: list[str]
    points_threshold: int  # positions <= this count as "scored"


TARGETS: dict[str, Target] = {
    "race_points": Target(
        name="race_points",
        display="Race — driver scores points (top 10)",
        label_col="label_race_points",
        # Deliberately NO practice features here — ablation on 2025 showed they
        # *hurt* race-points predictions (log_loss 0.492 → 0.500). Race outcomes
        # involve strategy, incidents, safety cars, long-run tyre deg, which
        # practice pace cannot measure. See docs/learning/09-practice-pace.md §5.
        features=[
            "grid_position",
            "quali_gap_to_pole",
            *BASE_FEATURES,
        ],
        points_threshold=10,
    ),
    "quali_top10": Target(
        name="quali_top10",
        display="Qualifying — driver reaches Q3 (top 10)",
        label_col="label_quali_top10",
        features=[
            # grid_position and quali_gap_to_pole are NOT features here —
            # both are downstream of the thing we are trying to predict.
            "driver_quali_gap_last_3",
            "driver_quali_top10_rate_last_10",
            "fp_best_gap_to_fastest",
            "fp_long_run_gap_to_fastest",
            *BASE_FEATURES,
        ],
        points_threshold=10,
    ),
    "sprint_points": Target(
        name="sprint_points",
        display="Sprint — driver scores points (top 8)",
        label_col="label_sprint_points",
        features=[
            "sprint_grid_position",
            *BASE_FEATURES,
        ],
        points_threshold=8,
    ),
    "sprint_grid_top5": Target(
        name="sprint_grid_top5",
        display="Sprint Qualifying — driver starts top 5",
        label_col="label_sprint_grid_top5",
        features=[
            "driver_quali_gap_last_3",
            "driver_quali_top10_rate_last_10",
            *BASE_FEATURES,
        ],
        points_threshold=5,
    ),
    # ---------- Phase 11 targets ----------
    "race_podium": Target(
        name="race_podium",
        display="Race — driver finishes on the podium (top 3)",
        label_col="label_race_podium",
        features=[
            "grid_position",
            "quali_gap_to_pole",
            *BASE_FEATURES,
        ],
        points_threshold=3,
    ),
    "race_winner": Target(
        name="race_winner",
        display="Race — driver WINS (1st place)",
        label_col="label_race_winner",
        features=[
            "grid_position",
            "quali_gap_to_pole",
            *BASE_FEATURES,
        ],
        points_threshold=1,
    ),
    "h2h_beats_teammate": Target(
        name="h2h_beats_teammate",
        display="Head-to-head — driver beats their teammate in the race",
        label_col="label_h2h_beats_teammate",
        features=[
            "grid_vs_teammate",
            "quali_gap_vs_teammate",
            "driver_points_last_5",
            "driver_finish_last_3",
            "driver_track_history",
        ],
        points_threshold=1,
    ),
}


# ---- Session loaders ---------------------------------------------------------


def _load_session_parquets(root: Path) -> pd.DataFrame:
    paths = sorted(root.glob("season=*/round=*.parquet"))
    if not paths:
        return pd.DataFrame()
    return pd.concat((pd.read_parquet(p) for p in paths), ignore_index=True)


def load_qualifying_results(dir_: Path | None = None) -> pd.DataFrame:
    return _load_session_parquets(dir_ or QUALIFYING_DIR)


def load_sprint_results(dir_: Path | None = None) -> pd.DataFrame:
    return _load_session_parquets(dir_ or SPRINT_DIR)


# ---- Unified frame builder ---------------------------------------------------


def _add_quali_labels_and_features(frame: pd.DataFrame) -> pd.DataFrame:
    """Merge in label_quali_top10 and compute recent-quali rolling features."""
    frame = frame.copy()
    quali = load_qualifying_results()

    if quali.empty:
        frame["label_quali_top10"] = pd.NA
    else:
        ql = pd.DataFrame(
            {
                "season": quali["season"].astype(int),
                "round": quali["round"].astype(int),
                "driver": quali["Abbreviation"].astype(str),
                "quali_position": pd.to_numeric(quali["Position"], errors="coerce"),
            }
        )
        ql["label_quali_top10"] = (ql["quali_position"].fillna(99) <= 10).astype(int)
        frame = frame.merge(
            ql[["season", "round", "driver", "label_quali_top10"]],
            on=["season", "round", "driver"],
            how="left",
        )

    # Rolling features computed on the unified frame — needs chronological order.
    frame = frame.sort_values(["driver", "event_date"]).reset_index(drop=True)
    grp = frame.groupby("driver", sort=False)

    frame["driver_quali_gap_last_3"] = grp["quali_gap_to_pole"].transform(
        lambda s: s.shift(1).rolling(3, min_periods=1).mean()
    )
    if "label_quali_top10" in frame.columns:
        frame["driver_quali_top10_rate_last_10"] = grp["label_quali_top10"].transform(
            lambda s: s.astype("float").shift(1).rolling(10, min_periods=3).mean()
        )
    else:
        frame["driver_quali_top10_rate_last_10"] = pd.NA

    return frame.sort_values(["event_date", "driver"]).reset_index(drop=True)


def _add_sprint_labels_and_features(frame: pd.DataFrame) -> pd.DataFrame:
    """Merge in sprint-session labels and sprint_grid_position feature."""
    frame = frame.copy()
    sprint = load_sprint_results()

    if sprint.empty:
        frame["sprint_grid_position"] = pd.NA
        frame["label_sprint_points"] = pd.NA
        frame["label_sprint_grid_top5"] = pd.NA
        return frame

    sp = pd.DataFrame(
        {
            "season": sprint["season"].astype(int),
            "round": sprint["round"].astype(int),
            "driver": sprint["Abbreviation"].astype(str),
            "sprint_grid_position": pd.to_numeric(sprint["GridPosition"], errors="coerce")
            .replace(0, 20)
            .fillna(20)
            .astype(float),
            "_sprint_finish": pd.to_numeric(sprint["Position"], errors="coerce"),
        }
    )
    sp["label_sprint_points"] = (sp["_sprint_finish"].fillna(99) <= 8).astype(int)
    sp["label_sprint_grid_top5"] = (sp["sprint_grid_position"] <= 5).astype(int)
    return frame.merge(
        sp[
            [
                "season",
                "round",
                "driver",
                "sprint_grid_position",
                "label_sprint_points",
                "label_sprint_grid_top5",
            ]
        ],
        on=["season", "round", "driver"],
        how="left",
    )


def _compute_circuit_history(all_race_results: pd.DataFrame) -> pd.DataFrame:
    """
    Per-(event_name, event_date) circuit-level features using only prior
    races at the same circuit. No leakage — shift(1) + expanding().mean().

    Returns columns:
      event_name, event_date, circuit_finish_std, circuit_grid_to_finish
    """
    df = pd.DataFrame(
        {
            "event_name": all_race_results["event_name"].astype(str),
            "event_date": pd.to_datetime(all_race_results["event_date"]),
            "position": pd.to_numeric(all_race_results["Position"], errors="coerce"),
            "grid": pd.to_numeric(all_race_results["GridPosition"], errors="coerce"),
        }
    )
    df["grid_to_finish_delta"] = df["position"] - df["grid"]

    per_race = (
        df.groupby(["event_name", "event_date"], as_index=False)
        .agg(
            finish_std_this=("position", "std"),
            grid_to_finish_this=("grid_to_finish_delta", "mean"),
        )
        .sort_values(["event_name", "event_date"])
        .reset_index(drop=True)
    )
    grp = per_race.groupby("event_name", sort=False)
    per_race["circuit_finish_std"] = grp["finish_std_this"].transform(
        lambda s: s.shift(1).expanding().mean()
    )
    per_race["circuit_grid_to_finish"] = grp["grid_to_finish_this"].transform(
        lambda s: s.shift(1).expanding().mean()
    )
    return per_race[
        ["event_name", "event_date", "circuit_finish_std", "circuit_grid_to_finish"]
    ]


def _add_circuit_features(frame: pd.DataFrame) -> pd.DataFrame:
    """Merge circuit-level stats into the unified frame."""
    all_raw = load_results()
    circuit_hist = _compute_circuit_history(all_raw)
    # Normalise both sides of the merge to plain Timestamps (no timezones).
    frame = frame.copy()
    frame["event_date"] = pd.to_datetime(frame["event_date"]).dt.tz_localize(None)
    circuit_hist["event_date"] = pd.to_datetime(circuit_hist["event_date"]).dt.tz_localize(None)
    return frame.merge(circuit_hist, on=["event_name", "event_date"], how="left")


def _add_podium_and_winner_labels(frame: pd.DataFrame) -> pd.DataFrame:
    """Podium and winner labels derived from the existing finish_position column."""
    frame = frame.copy()
    finish = frame["finish_position"]
    # NaN finish (DNF) → not podium, not winner
    frame["label_race_podium"] = (finish.fillna(99) <= 3).astype(int)
    frame["label_race_winner"] = (finish.fillna(99) == 1).astype(int)
    return frame


def _add_regulation_era(frame: pd.DataFrame) -> pd.DataFrame:
    """
    Ordinal regulation-era feature. F1's rule cuts matter:
      - 2014-2021: V6 turbo-hybrid era
      - 2022-2025: ground-effect era
      - 2026+    : new power units + active aero
    Encoded as an integer so tree models can split on 'older vs newer'.
    """
    frame = frame.copy()
    era = pd.Series(1, index=frame.index, dtype="int8")  # default: ground-effect
    era[frame["season"] <= 2021] = 0
    era[frame["season"] >= 2026] = 2
    frame["regulation_era"] = era.astype("int8")
    return frame


def _add_teammate_h2h(frame: pd.DataFrame) -> pd.DataFrame:
    """
    Teammate head-to-head features + label.

    For each (season, round, team), each driver's 'teammate' is the other
    driver on the same team at the same race. Features:
      - grid_vs_teammate      : driver grid − teammate grid
      - quali_gap_vs_teammate : driver quali_best − teammate quali_best
    Label:
      - label_h2h_beats_teammate : 1 iff driver finish < teammate finish
                                   (NaN for teams without a two-driver pair or
                                   when either driver did not finish).

    Implementation: self-merge on (season, round, team) then filter out the
    self-match. Replaces the earlier groupby.apply version which triggered a
    pandas FutureWarning about concat of all-NA entries.
    """
    key = ["season", "round", "team"]
    partner_cols = ["grid_position", "quali_best_seconds", "finish_position"]
    partner = (
        frame[[*key, "driver", *partner_cols]]
        .rename(
            columns={
                "driver": "_tm_driver",
                "grid_position": "teammate_grid",
                "quali_best_seconds": "teammate_quali",
                "finish_position": "teammate_finish",
            }
        )
    )

    merged = frame.merge(partner, on=key, how="left")
    merged = merged[merged["driver"] != merged["_tm_driver"]]

    # Teams with 3+ drivers that weekend (rare — reserves) would produce multiple
    # teammate matches per driver-race. Keep the first alphabetically stable one.
    merged = merged.drop_duplicates(subset=["season", "round", "driver"], keep="first").reset_index(drop=True)

    # Re-attach rows for drivers whose team fielded only one car that weekend
    # (they were filtered out by the self-match exclusion with no match). Give
    # them NaN teammate columns.
    orphans = frame.loc[~frame.set_index(["season", "round", "driver"]).index.isin(
        merged.set_index(["season", "round", "driver"]).index
    )].copy()
    for c in ("teammate_grid", "teammate_quali", "teammate_finish"):
        orphans[c] = np.nan
    orphans["_tm_driver"] = pd.NA

    full = pd.concat([merged, orphans], ignore_index=True)

    full["grid_vs_teammate"] = (
        full["grid_position"].astype(float)
        - pd.to_numeric(full["teammate_grid"], errors="coerce")
    )
    full["quali_gap_vs_teammate"] = (
        full["quali_best_seconds"].astype(float)
        - pd.to_numeric(full["teammate_quali"], errors="coerce")
    )

    driver_finish = pd.to_numeric(full["finish_position"], errors="coerce")
    teammate_finish = pd.to_numeric(full["teammate_finish"], errors="coerce")
    both_finished = driver_finish.notna() & teammate_finish.notna()
    # Use float dtype so we can store NaN cleanly (pandas extension dtypes are
    # heavier than we need here).
    label = pd.Series(np.nan, index=full.index, dtype=float)
    label.loc[both_finished] = (
        driver_finish[both_finished] < teammate_finish[both_finished]
    ).astype(float)
    full["label_h2h_beats_teammate"] = label

    return full.drop(columns=["teammate_grid", "teammate_quali", "teammate_finish", "_tm_driver"])


def build_multi_target_frame(raw: pd.DataFrame | None = None) -> pd.DataFrame:
    """
    Unified frame with all labels and features needed for any target.
    """
    if raw is None:
        raw = load_results()
    frame = build_features(raw)
    frame = frame.rename(columns={"points_finish": "label_race_points"})
    frame = _add_quali_labels_and_features(frame)
    frame = _add_sprint_labels_and_features(frame)
    frame = _add_circuit_features(frame)
    frame = _add_podium_and_winner_labels(frame)
    frame = _add_teammate_h2h(frame)
    frame = _add_regulation_era(frame)
    return frame


def prepare_target_frame(target: Target, frame: pd.DataFrame | None = None) -> pd.DataFrame:
    """
    Return rows whose label is non-null for this target.

    Feature NaNs are kept. LightGBM handles missing values natively; the
    linear pipeline imputes via median. That way adding an optional feature
    (e.g. practice pace, which may not exist for every race) never silently
    shrinks the training set.
    """
    f = frame if frame is not None else build_multi_target_frame()
    return f[f[target.label_col].notna()].copy()
