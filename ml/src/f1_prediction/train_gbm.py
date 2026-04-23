"""
Train the LightGBM model with time-series cross-validation and calibration.

Pipeline:
  1. Fold-by-fold time-series CV (expanding window) for an honest stability estimate.
  2. Final GBM fit on seasons <= train_through, with prior season used for
     early stopping.
  3. Raw GBM predictions on the test season (e.g. 2025).
  4. Isotonic calibration fitted on the season preceding the test.
  5. Metrics + reliability diagram for base_rate, grid_only, features_logit,
     GBM (raw), and GBM (calibrated).

Usage:
    uv run python -m f1_prediction.train_gbm
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

import numpy as np
import typer
from sklearn.calibration import CalibratedClassifierCV
from sklearn.frozen import FrozenEstimator
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GroupKFold

from f1_prediction.calibration import (
    expected_calibration_error,
    plot_reliability_comparison,
)
from f1_prediction.evaluate import (
    evaluate_probabilities,
    load_results,
    time_split,
)
from f1_prediction.features import FEATURES, build_features
from f1_prediction.models.baseline import (
    GridPositionBaseline,
    predict_always_baseline,
)
from f1_prediction.models.gbm import GbmModel, make_lgbm
from f1_prediction.models.linear import FeaturesLogit

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
METRICS_DIR = PROJECT_ROOT / "data" / "metrics"
ASSETS_DIR = PROJECT_ROOT.parents[1] / "docs" / "learning" / "assets"

app = typer.Typer(add_completion=False)


def _metrics_with_ece(y_true, y_prob, label):
    m = evaluate_probabilities(y_true, y_prob, label=label)
    m["ece"] = expected_calibration_error(y_true, y_prob)
    return m


def _format(m):
    return (
        f"{m['label']:26s}  n={m['n']:<5}  "
        f"log_loss={m['log_loss']:.4f}  "
        f"brier={m['brier']:.4f}  "
        f"ece={m.get('ece', float('nan')):.4f}  "
        f"acc@0.5={m['accuracy_at_0.5']:.3f}"
    )


@app.command()
def main(
    train_through: int = typer.Option(2024),
    test: int = typer.Option(2025),
) -> None:
    raw = load_results()
    frame = build_features(raw)

    # ----- Time-series CV (expanding window) -----------------------------------
    # Fold k: train on [<val_season], validate on val_season.
    cv_scores: list[dict[str, float]] = []
    cv_val_seasons = list(range(train_through - 2, train_through + 1))[1:]
    logger.info("Time-series CV — validating on %s", cv_val_seasons)
    for val_season in cv_val_seasons:
        train_cv = frame[frame["season"] < val_season]
        val_cv = frame[frame["season"] == val_season]
        if len(train_cv) == 0 or len(val_cv) == 0:
            continue
        gbm = GbmModel.fit(train_cv)
        fold_m = _metrics_with_ece(
            val_cv["points_finish"].to_numpy(),
            gbm.predict_proba(val_cv),
            f"gbm_cv_val={val_season}",
        )
        cv_scores.append(fold_m)
        logger.info(_format(fold_m))

    mean_ll = float(np.mean([s["log_loss"] for s in cv_scores])) if cv_scores else float("nan")
    mean_br = float(np.mean([s["brier"] for s in cv_scores])) if cv_scores else float("nan")
    logger.info("CV mean: log_loss=%.4f brier=%.4f", mean_ll, mean_br)

    # ----- Final models --------------------------------------------------------
    train_df, test_df = time_split(frame, train_through_season=train_through, test_season=test)
    y_test = test_df["points_finish"].to_numpy()

    # Reference models
    m_always = _metrics_with_ece(y_test, predict_always_baseline(test_df), "base_rate_only")
    m_grid = _metrics_with_ece(
        y_test,
        GridPositionBaseline.fit(train_df).predict_proba(test_df),
        "grid_only_logit",
    )
    m_feat = _metrics_with_ece(
        y_test,
        FeaturesLogit.fit(train_df).predict_proba(test_df),
        "features_logit",
    )

    # GBM raw: trained on ALL prior seasons (no data wasted as val for ES).
    gbm_full = GbmModel.fit(train_df)
    p_gbm_raw = gbm_full.predict_proba(test_df)
    m_gbm_raw = _metrics_with_ece(y_test, p_gbm_raw, "gbm_raw")

    # GBM calibrated via race-aware group CV: TimeSeriesSplit splits over ROWS,
    # which silently leaks race context (e.g. rows from R7 end up on both sides
    # of fold 1 because adjacent-in-index rows are different drivers at the
    # same race). GroupKFold with race_id = season*100+round keeps all drivers
    # from a given race in the same fold.
    X_all = train_df[FEATURES].to_numpy(dtype=float)
    y_all = train_df["points_finish"].to_numpy(dtype=int)
    race_ids = (train_df["season"].astype(int) * 100 + train_df["round"].astype(int)).to_numpy()

    gkf = GroupKFold(n_splits=3)
    oof = np.zeros(len(y_all), dtype=float)
    for train_idx, val_idx in gkf.split(X_all, y_all, groups=race_ids):
        fold_model = make_lgbm().fit(X_all[train_idx], y_all[train_idx])
        oof[val_idx] = fold_model.predict_proba(X_all[val_idx])[:, 1]

    # Fit Platt (logistic) calibrator on the race-level-honest OOF predictions.
    platt = LogisticRegression()
    platt.fit(oof.reshape(-1, 1), y_all)

    # Final: train base GBM on ALL training rows, then apply the Platt mapping at predict.
    final_gbm = make_lgbm().fit(X_all, y_all)
    test_raw = final_gbm.predict_proba(test_df[FEATURES].to_numpy(dtype=float))[:, 1]
    p_gbm_cal = platt.predict_proba(test_raw.reshape(-1, 1))[:, 1]
    m_gbm_cal = _metrics_with_ece(y_test, p_gbm_cal, "gbm_calibrated")

    # ----- Report --------------------------------------------------------------
    print()
    print(f"Evaluation on season {test} (n={len(test_df)})")
    print("-" * 100)
    for m in (m_always, m_grid, m_feat, m_gbm_raw, m_gbm_cal):
        print(_format(m))

    print()
    print("Feature importance (GBM, by total gain):")
    importances = gbm_full.feature_importance("gain")
    total = sum(importances.values()) or 1.0
    for name, gain in sorted(importances.items(), key=lambda x: x[1], reverse=True):
        pct = 100.0 * gain / total
        print(f"  {name:28s}  gain={gain:8.1f}  ({pct:5.1f}%)")

    # ----- Reliability diagram -------------------------------------------------
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    out_path = ASSETS_DIR / "reliability_comparison.png"
    grid_preds = GridPositionBaseline.fit(train_df).predict_proba(test_df)
    feat_preds = FeaturesLogit.fit(train_df).predict_proba(test_df)
    plot_reliability_comparison(
        y_true=y_test,
        models={
            "grid_only_logit": grid_preds,
            "features_logit": feat_preds,
            "gbm_raw": p_gbm_raw,
            "gbm_calibrated": p_gbm_cal,
        },
        out_path=out_path,
        title=f"Reliability — models evaluated on {test}",
    )
    logger.info("Wrote reliability diagram to %s", out_path)

    # ----- Metrics JSON --------------------------------------------------------
    METRICS_DIR.mkdir(parents=True, exist_ok=True)
    (METRICS_DIR / "gbm.json").write_text(
        json.dumps(
            {
                "cv_folds": cv_scores,
                "cv_mean_log_loss": float(mean_ll),
                "cv_mean_brier": float(mean_br),
                "test": [m_always, m_grid, m_feat, m_gbm_raw, m_gbm_cal],
                "feature_importance_gain": importances,
            },
            indent=2,
        )
    )
    logger.info("Wrote metrics to %s", METRICS_DIR / "gbm.json")


if __name__ == "__main__":
    app()
