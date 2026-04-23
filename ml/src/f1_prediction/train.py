"""
Unified training CLI — trains a GBM for any of the four targets.

Usage:
    uv run python -m f1_prediction.train race_points
    uv run python -m f1_prediction.train quali_top10
    uv run python -m f1_prediction.train sprint_points
    uv run python -m f1_prediction.train sprint_grid_top5

Each invocation:
  - Loads the unified multi-target frame.
  - Drops rows where this target's label or features are NaN.
  - Splits by time (train_through=2024, test=2025 by default).
  - Fits a GBM with the target's feature list.
  - Prints metrics + feature importance.
  - Saves metrics JSON.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

import typer

from f1_prediction.calibration import expected_calibration_error
from f1_prediction.evaluate import evaluate_probabilities
from f1_prediction.models.gbm import GbmModel, load_tuned_params
from f1_prediction.targets import (
    TARGETS,
    build_multi_target_frame,
    prepare_target_frame,
)

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
METRICS_DIR = PROJECT_ROOT / "data" / "metrics"

app = typer.Typer(add_completion=False)


def _fmt(m: dict) -> str:
    return (
        f"{m['label']:28s}  n={m['n']:<5}  "
        f"log_loss={m['log_loss']:.4f}  "
        f"brier={m['brier']:.4f}  "
        f"ece={m.get('ece', 0):.4f}  "
        f"acc@0.5={m['accuracy_at_0.5']:.3f}  "
        f"pos_rate={m['positive_rate']:.3f}"
    )


@app.command()
def main(
    target_name: str = typer.Argument(..., help=f"One of: {', '.join(TARGETS)}"),
    train_through: int = typer.Option(2024, help="Train on seasons ≤ this year."),
    test: int = typer.Option(2025, help="Evaluate on this season."),
) -> None:
    if target_name not in TARGETS:
        raise typer.BadParameter(f"Unknown target. Pick one of: {list(TARGETS)}")
    target = TARGETS[target_name]
    logger.info("Target: %s — %s", target.name, target.display)

    frame = build_multi_target_frame()
    usable = prepare_target_frame(target, frame=frame)

    train_df = usable[usable["season"] <= train_through].copy()
    test_df = usable[usable["season"] == test].copy()
    if len(train_df) == 0:
        raise typer.Exit(f"No training rows for target {target_name} ≤ {train_through}")
    if len(test_df) == 0:
        raise typer.Exit(f"No test rows for target {target_name} in {test}")

    # Integer label copy for sklearn / LightGBM
    train_df["_target_"] = train_df[target.label_col].astype(int)
    test_df["_target_"] = test_df[target.label_col].astype(int)

    logger.info(
        "Train: %d rows (seasons ≤%d). Test: %d rows (season %d). Features: %s",
        len(train_df), train_through, len(test_df), test, target.features,
    )

    # Auto-pick up Optuna-tuned params when present at data/tuned/<target>.json.
    tuned = load_tuned_params(target_name) or {}
    if tuned:
        logger.info("Using tuned hyperparameters from data/tuned/%s.json", target_name)
    gbm = GbmModel.fit(train_df, features=target.features, label_col="_target_", **tuned)
    y_test = test_df["_target_"].to_numpy()
    y_prob = gbm.predict_proba(test_df)
    metrics = evaluate_probabilities(y_test, y_prob, label=f"gbm_{target.name}")
    metrics["ece"] = expected_calibration_error(y_test, y_prob)

    print()
    print(f"{target.display}")
    print("-" * 100)
    print(_fmt(metrics))

    print()
    print("Feature importance (GBM, by total gain):")
    importances = gbm.feature_importance("gain")
    total = sum(importances.values()) or 1.0
    for name, gain in sorted(importances.items(), key=lambda x: x[1], reverse=True):
        pct = 100.0 * gain / total
        print(f"  {name:35s} gain={gain:8.1f}  ({pct:5.1f}%)")

    METRICS_DIR.mkdir(parents=True, exist_ok=True)
    (METRICS_DIR / f"target_{target.name}.json").write_text(
        json.dumps({"metrics": metrics, "feature_importance": importances}, indent=2)
    )
    logger.info("Wrote metrics to %s", METRICS_DIR / f"target_{target.name}.json")


if __name__ == "__main__":
    app()
