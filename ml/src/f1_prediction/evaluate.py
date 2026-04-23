"""
Training-frame assembly and evaluation utilities.

One canonical function loads all ingested race results into a flat DataFrame
with the target label (`points_finish`) attached. Train/test splits are
strictly chronological — no random shuffles — because leaking future races
into training would give artificially good numbers.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import brier_score_loss, log_loss

PROJECT_ROOT = Path(__file__).resolve().parents[2]
RAW_RESULTS_DIR = PROJECT_ROOT / "data" / "raw" / "results"

POINTS_CUTOFF = 10  # finishing in top 10 = scored points (standard F1 scoring since 2010)


def load_results(data_dir: Path | None = None) -> pd.DataFrame:
    """Read every ingested race result Parquet into one DataFrame."""
    root = Path(data_dir) if data_dir else RAW_RESULTS_DIR
    paths = sorted(root.glob("season=*/round=*.parquet"))
    if not paths:
        raise FileNotFoundError(
            f"No race result Parquet files found under {root}. "
            "Run `uv run python -m f1_prediction.ingest --year <year>` first."
        )
    return pd.concat((pd.read_parquet(p) for p in paths), ignore_index=True)


def build_training_frame(df: pd.DataFrame) -> pd.DataFrame:
    """
    Turn raw FastF1 results into a training frame with target + minimal features.

    Columns returned:
        season, round, event_date, driver, team, grid_position, points_finish (0/1)

    Rules:
        - grid_position 0 (pitlane start) treated as back-of-grid (20) — a valid
          racing outcome, not missing data.
        - If GridPosition itself is NaN (corrupt / incomplete parquet), the row
          is DROPPED entirely. Previous behaviour silently filled NaN with 20,
          which masqueraded as "back-marker non-scorers" and polluted training
          with hundreds of synthetic negatives from incomplete historical files.
        - points_finish = 1 if final Position <= 10, else 0. Position NaN for a
          row with a VALID GridPosition is a genuine DNF → points_finish = 0.
    """
    grid = pd.to_numeric(df["GridPosition"], errors="coerce").replace(0, 20)
    valid = grid.notna()
    df = df[valid].reset_index(drop=True)
    grid = grid[valid].reset_index(drop=True)

    out = pd.DataFrame(
        {
            "season": df["season"].astype(int),
            "round": df["round"].astype(int),
            "event_date": pd.to_datetime(df["event_date"]),
            "driver": df["Abbreviation"].astype(str),
            "team": df["TeamName"].astype(str),
            "grid_position": grid.astype(float),
            "finish_position": pd.to_numeric(df["Position"], errors="coerce"),
        }
    )
    out["points_finish"] = (out["finish_position"].fillna(99) <= POINTS_CUTOFF).astype(int)
    return out


def time_split(
    frame: pd.DataFrame,
    train_through_season: int,
    test_season: int,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Split chronologically. train = seasons <= train_through_season, test = one season.

    Never shuffle. Time-series data must not leak.
    """
    train = frame[frame["season"] <= train_through_season].copy()
    test = frame[frame["season"] == test_season].copy()
    if len(train) == 0:
        raise ValueError(f"No training rows for seasons <= {train_through_season}")
    if len(test) == 0:
        raise ValueError(f"No test rows for season {test_season}")
    return train, test


def evaluate_probabilities(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    label: str = "model",
) -> dict[str, float]:
    """
    Probability-aware metrics. Accuracy alone lies for calibrated models.

    log_loss   — penalises over-confident wrong predictions more than hedged ones.
    brier      — squared error on probabilities. Proper scoring rule. Lower is better.
    accuracy   — only at the 0.5 threshold; mostly shown for folklore comparison.
    positive_rate — sanity check: fraction of races where driver actually scored.
    """
    metrics = {
        "log_loss": float(log_loss(y_true, np.clip(y_prob, 1e-7, 1 - 1e-7))),
        "brier": float(brier_score_loss(y_true, y_prob)),
        "accuracy_at_0.5": float(((y_prob >= 0.5).astype(int) == y_true).mean()),
        "positive_rate": float(y_true.mean()),
        "n": int(len(y_true)),
    }
    metrics["label"] = label
    return metrics


def format_metrics(metrics: dict[str, float]) -> str:
    return (
        f"{metrics['label']:20s}  "
        f"n={metrics['n']:<5}  "
        f"log_loss={metrics['log_loss']:.4f}  "
        f"brier={metrics['brier']:.4f}  "
        f"acc@0.5={metrics['accuracy_at_0.5']:.3f}  "
        f"pos_rate={metrics['positive_rate']:.3f}"
    )
