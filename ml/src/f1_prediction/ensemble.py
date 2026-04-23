"""
Weighted-average ensemble across the model family.

Given a set of already-fitted models, finds non-negative weights that sum
to 1 and minimize log-loss on a validation slice. Uses `scipy.optimize` with
SLSQP — it's well-behaved for this convex-ish problem with only 2-3 weights.

Why we ensemble:
- Different models make different kinds of mistakes. The linear model is
  good at calibrated probabilities; the GBM finds interactions. Their
  weighted average often beats either alone.
- On small datasets (like ours) ensembling is one of the cheapest ways to
  squeeze 3–10% more out of the system.

Intentionally simple. We don't do stacking (training a meta-model on OOF
predictions) — it adds complexity and on this data size, simple weighted
averaging captures most of the ensembling gain.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

import numpy as np
import pandas as pd
from scipy.optimize import minimize


class PredictProba(Protocol):
    """Anything with a `.predict_proba(df) -> np.ndarray` of shape (n,)."""

    def predict_proba(self, df: pd.DataFrame) -> np.ndarray: ...


@dataclass
class WeightedEnsemble:
    """Weighted average of model probabilities. Weights sum to 1, all ≥ 0."""

    names: list[str]
    models: list[PredictProba]
    weights: np.ndarray  # shape (len(models),)

    @classmethod
    def fit(
        cls,
        named_models: dict[str, PredictProba],
        val_df: pd.DataFrame,
        label_col: str,
    ) -> "WeightedEnsemble":
        """
        Fit ensemble weights by minimising log-loss on `val_df`.

        The models are already trained. We collect each model's predictions on
        val_df, then solve for non-negative weights summing to 1.
        """
        names = list(named_models.keys())
        preds = np.stack([named_models[n].predict_proba(val_df) for n in names], axis=1)
        y = val_df[label_col].astype(int).to_numpy()

        def neg_log_loss(w: np.ndarray) -> float:
            p = np.clip(preds @ w, 1e-7, 1 - 1e-7)
            return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))

        n = len(names)
        w0 = np.ones(n) / n  # start uniform
        bounds = [(0.0, 1.0) for _ in range(n)]
        constraints = [{"type": "eq", "fun": lambda w: float(np.sum(w) - 1.0)}]
        result = minimize(
            neg_log_loss,
            w0,
            method="SLSQP",
            bounds=bounds,
            constraints=constraints,
            options={"ftol": 1e-8},
        )
        weights = np.clip(result.x, 0.0, 1.0)
        weights = weights / weights.sum()  # renormalise after any numerical drift
        return cls(
            names=names,
            models=[named_models[n] for n in names],
            weights=weights,
        )

    def predict_proba(self, df: pd.DataFrame) -> np.ndarray:
        preds = np.stack([m.predict_proba(df) for m in self.models], axis=1)
        return np.clip(preds @ self.weights, 0.0, 1.0)

    def weights_dict(self) -> dict[str, float]:
        return dict(zip(self.names, (float(w) for w in self.weights), strict=True))
