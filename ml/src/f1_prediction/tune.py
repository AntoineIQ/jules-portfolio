"""
Hyperparameter tuning for the GBM via Optuna + time-series CV.

Optuna runs a Bayesian search (TPE sampler) over a sensible LightGBM
hyperparameter space, evaluating each candidate by mean log-loss across
expanding-window time-series folds. The best parameters are written to
``data/tuned/<target>.json`` and picked up by a tuned `GbmModel.fit_tuned`
at both training and serving time.

Usage:
    uv run python -m f1_prediction.tune race_points --trials 60
    uv run python -m f1_prediction.tune quali_top10 --trials 60

Design notes:
- CV folds are expanding-window by season: train on prior seasons, validate
  on the next. This matches how we evaluate the final model (train through
  2024, test on 2025) and respects time-series leakage rules.
- We suppress optuna's trial logs except on every 10th trial — the default
  chatter would drown out everything else.
- The tuning itself doesn't touch the test set (2025). That's sacred.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

import lightgbm as lgb
import numpy as np
import optuna
import typer
from sklearn.metrics import log_loss

from f1_prediction.targets import (
    TARGETS,
    build_multi_target_frame,
    prepare_target_frame,
)

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
TUNED_DIR = PROJECT_ROOT / "data" / "tuned"

optuna.logging.set_verbosity(optuna.logging.WARNING)

app = typer.Typer(add_completion=False)


def _season_splits(seasons: np.ndarray) -> list[tuple[np.ndarray, np.ndarray]]:
    """Expanding-window time-series CV by season. Each fold trains on strictly
    earlier seasons and validates on the next one in the training set."""
    unique = sorted(set(seasons.tolist()))
    splits: list[tuple[np.ndarray, np.ndarray]] = []
    for val_season in unique[1:]:
        train_idx = np.where(seasons < val_season)[0]
        val_idx = np.where(seasons == val_season)[0]
        if len(train_idx) == 0 or len(val_idx) == 0:
            continue
        splits.append((train_idx, val_idx))
    return splits


def _objective(
    trial: optuna.Trial,
    X: np.ndarray,
    y: np.ndarray,
    splits: list[tuple[np.ndarray, np.ndarray]],
) -> float:
    params: dict[str, Any] = {
        "objective": "binary",
        "metric": "binary_logloss",
        "n_estimators": trial.suggest_int("n_estimators", 100, 800, step=50),
        "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.15, log=True),
        "num_leaves": trial.suggest_int("num_leaves", 4, 31),
        "max_depth": trial.suggest_int("max_depth", 3, 10),
        "min_child_samples": trial.suggest_int("min_child_samples", 5, 60),
        "reg_lambda": trial.suggest_float("reg_lambda", 0.01, 10.0, log=True),
        "reg_alpha": trial.suggest_float("reg_alpha", 0.001, 5.0, log=True),
        "colsample_bytree": trial.suggest_float("colsample_bytree", 0.5, 1.0),
        "subsample": trial.suggest_float("subsample", 0.5, 1.0),
        "subsample_freq": 5,
        "random_state": 42,
        "n_jobs": -1,
        "verbose": -1,
    }
    fold_scores = []
    for train_idx, val_idx in splits:
        model = lgb.LGBMClassifier(**params)
        model.fit(X[train_idx], y[train_idx])
        y_prob = model.predict_proba(X[val_idx])[:, 1]
        y_prob = np.clip(y_prob, 1e-7, 1 - 1e-7)
        # labels=[0, 1] so log_loss works even if a fold has all-same class.
        fold_scores.append(log_loss(y[val_idx], y_prob, labels=[0, 1]))
    return float(np.mean(fold_scores))


def tune_target(target_name: str, n_trials: int = 60, train_through: int = 2024) -> dict[str, Any]:
    if target_name not in TARGETS:
        raise ValueError(f"Unknown target: {target_name}. Pick: {list(TARGETS)}")
    target = TARGETS[target_name]
    frame = build_multi_target_frame()
    usable = prepare_target_frame(target, frame=frame)
    train = usable[usable["season"] <= train_through].copy()
    if len(train) == 0:
        raise ValueError(f"No training rows for target {target_name} ≤ {train_through}")

    X = train[target.features].to_numpy(dtype=float)
    y = train[target.label_col].astype(int).to_numpy()
    seasons = train["season"].to_numpy()
    splits = _season_splits(seasons)
    if not splits:
        raise ValueError("Not enough seasons for time-series CV")

    logger.info(
        "Tuning %s — features=%s, train rows=%s, CV folds=%s, trials=%s",
        target_name, len(target.features), len(train), len(splits), n_trials,
    )

    study = optuna.create_study(
        direction="minimize",
        sampler=optuna.samplers.TPESampler(seed=42),
    )

    best_so_far: list[float] = [float("inf")]

    def _cb(_study: optuna.Study, trial: optuna.trial.FrozenTrial) -> None:
        if trial.value is not None and trial.value < best_so_far[0]:
            best_so_far[0] = trial.value
            logger.info("  trial %s best=%0.4f", trial.number, trial.value)

    study.optimize(
        lambda t: _objective(t, X, y, splits),
        n_trials=n_trials,
        callbacks=[_cb],
        show_progress_bar=False,
    )

    best = {
        "params": study.best_params,
        "mean_cv_log_loss": float(study.best_value),
        "n_trials": n_trials,
        "n_features": len(target.features),
        "n_train_rows": len(train),
        "cv_folds": len(splits),
    }
    TUNED_DIR.mkdir(parents=True, exist_ok=True)
    out = TUNED_DIR / f"{target_name}.json"
    out.write_text(json.dumps(best, indent=2))
    logger.info("Best mean CV log-loss: %0.4f → wrote %s", study.best_value, out)
    return best


@app.command()
def main(
    target: str = typer.Argument(..., help=f"One of: {', '.join(TARGETS)}"),
    trials: int = typer.Option(60, help="Number of Optuna trials."),
) -> None:
    tune_target(target, n_trials=trials)


if __name__ == "__main__":
    app()


def load_tuned_params(target_name: str) -> dict[str, Any] | None:
    """Read best params from disk, if tuning has been run for this target."""
    p = TUNED_DIR / f"{target_name}.json"
    if not p.exists():
        return None
    return json.loads(p.read_text())["params"]
