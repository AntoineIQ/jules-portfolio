"""
End-to-end Phase 10 evaluator: for each target, train the full model family
(tuned GBM, baseline, features_logit), fit a weighted ensemble, and report
every model's 2025 performance side-by-side.

Usage:
    uv run python -m f1_prediction.train_all

Writes one JSON per target to data/metrics/phase10_<target>.json.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

import typer

from f1_prediction.calibration import expected_calibration_error
from f1_prediction.ensemble import WeightedEnsemble
from f1_prediction.evaluate import evaluate_probabilities
from f1_prediction.models.baseline import GridPositionBaseline
from f1_prediction.models.gbm import GbmModel, load_tuned_params
from f1_prediction.models.linear import FeaturesLogit
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


def _metrics(y_true, y_prob, label):
    m = evaluate_probabilities(y_true, y_prob, label=label)
    m["ece"] = expected_calibration_error(y_true, y_prob)
    return m


def _fmt(m):
    return (
        f"  {m['label']:28s}  log_loss={m['log_loss']:.4f}  "
        f"brier={m['brier']:.4f}  ece={m['ece']:.4f}  acc@0.5={m['accuracy_at_0.5']:.3f}"
    )


@app.command()
def main(
    train_through: int = typer.Option(2024, help="Seasons ≤ this year for training."),
    test: int = typer.Option(2025, help="Test season."),
    ensemble_val: int = typer.Option(
        2024,
        help="Season used as held-out validation for ensemble-weight fitting. "
        "Must be inside the training window.",
    ),
) -> None:
    frame = build_multi_target_frame()
    summary = {}

    for target_name, target in TARGETS.items():
        usable = prepare_target_frame(target, frame=frame)
        all_train = usable[usable["season"] <= train_through].copy()
        test_df = usable[usable["season"] == test].copy()
        all_train["_t_"] = all_train[target.label_col].astype(int)
        test_df["_t_"] = test_df[target.label_col].astype(int)

        # Ensemble validation slice + shrunken train for building ensemble members
        ens_val = all_train[all_train["season"] == ensemble_val].copy()
        ens_train = all_train[all_train["season"] < ensemble_val].copy()
        if len(ens_val) == 0 or len(ens_train) == 0:
            logger.warning("Skipping ensemble for %s — insufficient val slice", target_name)
            continue

        y_test = test_df["_t_"].to_numpy()
        y_val = ens_val["_t_"].to_numpy()

        # --- Individual final models (trained on ALL train seasons ≤ train_through) ---
        target_metrics = []

        # Baseline — applies to race_points only (grid_position must exist)
        if "grid_position" in target.features:
            baseline_all = GridPositionBaseline.fit(
                all_train.assign(points_finish=all_train["_t_"])
            )
            pb = baseline_all.predict_proba(test_df)
            target_metrics.append(_metrics(y_test, pb, "baseline (final)"))

        # Features logit — MUST pass target.features so we don't leak
        # grid_position into quali/sprint predictions.
        flogit_all = FeaturesLogit.fit(
            all_train, features=target.features, label_col="_t_"
        )
        pf = flogit_all.predict_proba(test_df)
        target_metrics.append(_metrics(y_test, pf, "features_logit (final)"))

        # Untuned GBM
        gbm_plain = GbmModel.fit(all_train, features=target.features, label_col="_t_")
        pg = gbm_plain.predict_proba(test_df)
        target_metrics.append(_metrics(y_test, pg, "gbm (untuned, final)"))

        # Tuned GBM
        tuned_params = load_tuned_params(target_name)
        if tuned_params is not None:
            gbm_tuned = GbmModel.fit(
                all_train, features=target.features, label_col="_t_", **tuned_params
            )
            pt = gbm_tuned.predict_proba(test_df)
            target_metrics.append(_metrics(y_test, pt, "gbm (tuned, final)"))

        # --- Ensemble: retrain each member on ens_train only, fit weights on ens_val ---
        member_models = {}
        if "grid_position" in target.features:
            baseline_e = GridPositionBaseline.fit(
                ens_train.assign(points_finish=ens_train["_t_"])
            )
            member_models["baseline"] = _ProbaWrap(baseline_e.predict_proba)
        flogit_e = FeaturesLogit.fit(ens_train, features=target.features, label_col="_t_")
        member_models["features_logit"] = _ProbaWrap(flogit_e.predict_proba)
        gbm_e_plain = GbmModel.fit(ens_train, features=target.features, label_col="_t_")
        member_models["gbm_plain"] = _ProbaWrap(gbm_e_plain.predict_proba)
        if tuned_params is not None:
            gbm_e_tuned = GbmModel.fit(
                ens_train, features=target.features, label_col="_t_", **tuned_params
            )
            member_models["gbm_tuned"] = _ProbaWrap(gbm_e_tuned.predict_proba)

        ens = WeightedEnsemble.fit(
            member_models, ens_val.assign(points_finish=ens_val["_t_"]), "points_finish"
        )
        pe = ens.predict_proba(test_df)
        m_ens = _metrics(y_test, pe, "ensemble (weighted)")
        target_metrics.append(m_ens)

        # --- Print ---
        print(f"\n{target.display}")
        print("-" * 98)
        for m in target_metrics:
            print(_fmt(m))
        print(f"  ensemble weights: {ens.weights_dict()}")

        summary[target_name] = {
            "metrics": target_metrics,
            "ensemble_weights": ens.weights_dict(),
            "tuned_params": tuned_params,
        }

        METRICS_DIR.mkdir(parents=True, exist_ok=True)
        (METRICS_DIR / f"phase10_{target_name}.json").write_text(
            json.dumps(
                {
                    "target": target_name,
                    "metrics": target_metrics,
                    "ensemble_weights": ens.weights_dict(),
                    "tuned_params": tuned_params,
                },
                indent=2,
            )
        )

    print()
    logger.info("Done. Wrote %s target summaries.", len(summary))


class _ProbaWrap:
    """Wrap a callable to satisfy the PredictProba protocol."""

    def __init__(self, fn):
        self._fn = fn

    def predict_proba(self, df):
        return self._fn(df)


if __name__ == "__main__":
    app()
