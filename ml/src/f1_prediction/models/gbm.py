"""
Gradient-boosted tree classifier (LightGBM).

Why a tree model beats our linear baseline:
  - Captures non-linear interactions automatically (e.g. "front of grid AND
    good team" is more than the sum of the two signals — trees split on one
    feature at a time and discover these combinations).
  - Handles NaN and mixed scales natively — no imputer, no scaler needed.
  - Fast to train (seconds on our data).

See docs/learning/04-gradient-boosting.md for the intuition.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import lightgbm as lgb
import numpy as np
import pandas as pd

from f1_prediction.features import FEATURES


DEFAULT_PARAMS: dict[str, Any] = {
    "objective": "binary",
    "metric": "binary_logloss",
    # Conservative defaults for a small dataset (~1.4k rows, 7 features):
    #   - shallow trees, aggressive regularisation, row + feature subsampling.
    # The common mistake is to throw "GBM defaults" at small data and watch it
    # overfit. We want a gentle, high-bias-low-variance model here.
    "n_estimators": 400,
    "learning_rate": 0.03,
    "num_leaves": 8,
    "max_depth": 4,
    "min_child_samples": 30,
    "reg_lambda": 2.0,
    "colsample_bytree": 0.8,
    "subsample": 0.8,
    "subsample_freq": 5,
    "random_state": 42,
    "n_jobs": -1,
    "verbose": -1,
}


def make_lgbm(**overrides: Any) -> lgb.LGBMClassifier:
    """Factory returning an unfitted LGBMClassifier with project defaults."""
    return lgb.LGBMClassifier(**{**DEFAULT_PARAMS, **overrides})


def load_tuned_params(target_name: str) -> dict[str, Any] | None:
    """
    Read Optuna-tuned parameters for a target from data/tuned/<target>.json.

    Returns None if tuning has not been run for this target yet.
    """
    import json
    from pathlib import Path

    project_root = Path(__file__).resolve().parents[3]
    p = project_root / "data" / "tuned" / f"{target_name}.json"
    if not p.exists():
        return None
    return json.loads(p.read_text())["params"]


@dataclass
class GbmModel:
    model: lgb.LGBMClassifier
    features: list[str]
    label_col: str

    @classmethod
    def fit(
        cls,
        train_df: pd.DataFrame,
        val_df: pd.DataFrame | None = None,
        features: list[str] | None = None,
        label_col: str = "points_finish",
        time_decay_lambda: float = 0.0,
        era_weights: dict[int, float] | None = None,
        **params: Any,
    ) -> "GbmModel":
        """
        Fit the GBM.

        time_decay_lambda: if > 0, apply exponentially-decayed sample weights
          w_i = exp(-lambda * weeks_from_most_recent_race_in_training_set).
          Higher lambda = more emphasis on recent races.

        era_weights: optional mapping of regulation_era value → multiplier.
          e.g. {2: 5.0} gives each 2026+ (new PU era) row 5× the weight of
          other rows. Enables training on all historical data while adapting
          faster to the new regime. Multiplies onto any time-decay weights.
        """
        feat = features if features is not None else FEATURES
        p = {**DEFAULT_PARAMS, **params}
        X_train = train_df[feat].to_numpy(dtype=float)
        y_train = train_df[label_col].to_numpy(dtype=int)

        sample_weight = None
        if time_decay_lambda > 0.0 and "event_date" in train_df.columns:
            dates = pd.to_datetime(train_df["event_date"], errors="coerce").dt.tz_localize(None)
            max_date = dates.max()
            weeks_ago = (max_date - dates).dt.total_seconds() / (7 * 86400)
            weeks_ago = weeks_ago.fillna(weeks_ago.median() if weeks_ago.notna().any() else 0.0)
            sample_weight = np.exp(-time_decay_lambda * weeks_ago.to_numpy())
        if era_weights and "regulation_era" in train_df.columns:
            era = train_df["regulation_era"].to_numpy()
            era_multipliers = np.ones_like(era, dtype=float)
            for era_val, mul in era_weights.items():
                era_multipliers[era == era_val] = mul
            if sample_weight is None:
                sample_weight = era_multipliers
            else:
                sample_weight = sample_weight * era_multipliers

        model = lgb.LGBMClassifier(**p)

        if val_df is not None:
            X_val = val_df[feat].to_numpy(dtype=float)
            y_val = val_df[label_col].to_numpy(dtype=int)
            model.fit(
                X_train,
                y_train,
                sample_weight=sample_weight,
                eval_set=[(X_val, y_val)],
                eval_names=["val"],
                callbacks=[lgb.early_stopping(50, verbose=False)],
            )
        else:
            model.fit(X_train, y_train, sample_weight=sample_weight)
        return cls(model=model, features=feat, label_col=label_col)

    def predict_proba(self, df: pd.DataFrame) -> np.ndarray:
        X = df[self.features].to_numpy(dtype=float)
        return self.model.predict_proba(X)[:, 1]

    def feature_importance(self, kind: str = "gain") -> dict[str, float]:
        """Importance by total gain (sum of loss reduction over all splits)."""
        booster = self.model.booster_
        vals = booster.feature_importance(importance_type=kind).tolist()
        return dict(zip(self.features, vals, strict=True))
