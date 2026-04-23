"""
Baseline model: P(points) = f(grid_position) via simple logistic regression.

Why this baseline?
    - Grid position is the single strongest predictor in F1.
    - If a "fancy" model does not beat this, the fancy model is not actually
      learning F1 — it is noise.

It is a classifier (0 = no points, 1 = points) but we care about its
predicted PROBABILITY, not its hard class. Calibration matters here.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

FEATURES: list[str] = ["grid_position"]


@dataclass
class GridPositionBaseline:
    """Wrapper around sklearn LogisticRegression on grid_position only.

    Pipeline-wrapped with SimpleImputer(median) so NaN grid values (rare, but
    do appear for reserve drivers / corrupt session data) don't crash the
    model at predict time.
    """

    pipeline: Pipeline

    @classmethod
    def fit(cls, frame: pd.DataFrame) -> "GridPositionBaseline":
        X = frame[FEATURES].to_numpy(dtype=float)
        y = frame["points_finish"].to_numpy(dtype=int)
        # Drop any training rows with NaN features or label (rare — belt & suspenders).
        mask = ~np.isnan(X).any(axis=1) & ~pd.isna(y)
        X, y = X[mask], y[mask].astype(int)
        pipeline = Pipeline(
            [
                ("imputer", SimpleImputer(strategy="median")),
                ("clf", LogisticRegression(C=1e9, solver="lbfgs", max_iter=1000)),
            ]
        )
        pipeline.fit(X, y)
        return cls(pipeline=pipeline)

    def predict_proba(self, frame: pd.DataFrame) -> np.ndarray:
        X = frame[FEATURES].to_numpy(dtype=float)
        return self.pipeline.predict_proba(X)[:, 1]

    @property
    def clf(self) -> LogisticRegression:
        """Backward-compat accessor for the inner LogisticRegression."""
        return self.pipeline.named_steps["clf"]


def predict_always_baseline(frame: pd.DataFrame) -> np.ndarray:
    """
    Reference floor: every driver gets P = overall base rate (~10/20 = 0.5).

    Any model should beat this trivially on log-loss. If it does not, the
    model has learnt nothing.
    """
    base_rate = float(frame["points_finish"].mean())
    return np.full(len(frame), base_rate, dtype=float)
