"""
Train the baseline model and print metrics.

Usage:
    uv run python -m f1_prediction.train_baseline
    uv run python -m f1_prediction.train_baseline --train-through 2023 --test 2024
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

import typer

from f1_prediction.evaluate import (
    build_training_frame,
    evaluate_probabilities,
    format_metrics,
    load_results,
    time_split,
)
from f1_prediction.models.baseline import (
    GridPositionBaseline,
    predict_always_baseline,
)

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
METRICS_DIR = PROJECT_ROOT / "data" / "metrics"


app = typer.Typer(add_completion=False)


@app.command()
def main(
    train_through: int = typer.Option(2024, help="Use seasons up to & including this year for training."),
    test: int = typer.Option(2025, help="Season to evaluate on."),
) -> None:
    raw = load_results()
    frame = build_training_frame(raw)
    train_df, test_df = time_split(frame, train_through_season=train_through, test_season=test)

    logger.info(
        "Train: seasons ≤%s, %s rows. Test: season %s, %s rows.",
        train_through, len(train_df), test, len(test_df),
    )

    # Reference floor — constant base-rate prediction
    baseline_always = predict_always_baseline(test_df)
    metrics_always = evaluate_probabilities(
        test_df["points_finish"].to_numpy(),
        baseline_always,
        label="base_rate_only",
    )

    # Grid-position baseline
    baseline = GridPositionBaseline.fit(train_df)
    preds = baseline.predict_proba(test_df)
    metrics_grid = evaluate_probabilities(
        test_df["points_finish"].to_numpy(),
        preds,
        label="grid_position_logit",
    )

    # Learnt coefficients — useful sanity check
    coef = float(baseline.clf.coef_[0, 0])
    intercept = float(baseline.clf.intercept_[0])

    print()
    print("Baseline evaluation")
    print("-" * 95)
    print(format_metrics(metrics_always))
    print(format_metrics(metrics_grid))
    print()
    print(f"Fitted coefficient for grid_position: {coef:+.4f}  (negative = higher grid → lower P)")
    print(f"Intercept: {intercept:+.4f}")
    print()
    print("Interpretation:")
    print(f"  P(points | grid=1)  ≈ {_prob(intercept + coef * 1):.3f}")
    print(f"  P(points | grid=10) ≈ {_prob(intercept + coef * 10):.3f}")
    print(f"  P(points | grid=20) ≈ {_prob(intercept + coef * 20):.3f}")

    METRICS_DIR.mkdir(parents=True, exist_ok=True)
    out = METRICS_DIR / "baseline.json"
    out.write_text(json.dumps([metrics_always, metrics_grid], indent=2))
    logger.info("Wrote metrics to %s", out)


def _prob(logit: float) -> float:
    import math
    return 1.0 / (1.0 + math.exp(-logit))


if __name__ == "__main__":
    app()
