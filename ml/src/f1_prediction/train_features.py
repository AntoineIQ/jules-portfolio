"""
Train the features logistic, compare against baseline, print metrics.

Usage:
    uv run python -m f1_prediction.train_features
    uv run python -m f1_prediction.train_features --train-through 2023 --test 2024
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

import typer

from f1_prediction.evaluate import (
    evaluate_probabilities,
    format_metrics,
    load_results,
    time_split,
)
from f1_prediction.features import FEATURES, build_features
from f1_prediction.models.baseline import (
    GridPositionBaseline,
    predict_always_baseline,
)
from f1_prediction.models.linear import FeaturesLogit

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
    featured = build_features(raw)
    train_df, test_df = time_split(featured, train_through_season=train_through, test_season=test)

    logger.info(
        "Train: seasons ≤%s, %s rows. Test: season %s, %s rows.",
        train_through, len(train_df), test, len(test_df),
    )

    y_test = test_df["points_finish"].to_numpy()

    m_always = evaluate_probabilities(
        y_test, predict_always_baseline(test_df), label="base_rate_only"
    )
    baseline = GridPositionBaseline.fit(train_df)
    m_grid = evaluate_probabilities(
        y_test, baseline.predict_proba(test_df), label="grid_only_logit"
    )
    features_model = FeaturesLogit.fit(train_df)
    m_feat = evaluate_probabilities(
        y_test, features_model.predict_proba(test_df), label="features_logit"
    )

    print()
    print("Model comparison")
    print("-" * 100)
    for m in (m_always, m_grid, m_feat):
        print(format_metrics(m))
    print()
    print(
        f"Delta vs grid-only baseline:  "
        f"log_loss {m_grid['log_loss'] - m_feat['log_loss']:+.4f}  "
        f"brier    {m_grid['brier']    - m_feat['brier']:+.4f}  "
        f"(positive = features model improved)"
    )

    print()
    print("Standardised coefficients (how each feature pushes P(points)):")
    coefs = features_model.standardized_coefficients()
    for name, coef in sorted(coefs.items(), key=lambda x: abs(x[1]), reverse=True):
        arrow = "↑" if coef > 0 else "↓"
        print(f"  {name:28s} {coef:+.3f}  {arrow}")

    METRICS_DIR.mkdir(parents=True, exist_ok=True)
    out = METRICS_DIR / "features.json"
    out.write_text(json.dumps([m_always, m_grid, m_feat], indent=2))
    logger.info("Wrote metrics to %s", out)


if __name__ == "__main__":
    app()
