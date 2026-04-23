"""
Logistic regression on the full engineered feature set.

This is not the "better model" of the project — that's LightGBM in Phase 5.
It is a middle step: shows whether features add value even inside a linear
model. If a linear model improves over the grid-only baseline, a tree model
will improve further.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np  # noqa: F401 — kept for type-hint clarity
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from f1_prediction.features import FEATURES


@dataclass
class FeaturesLogit:
    """Imputed + standardised logistic regression on a configurable feature set."""

    pipeline: Pipeline
    features: list[str]
    label_col: str

    @classmethod
    def fit(
        cls,
        frame: pd.DataFrame,
        features: list[str] | None = None,
        label_col: str = "points_finish",
    ) -> "FeaturesLogit":
        feat = features if features is not None else FEATURES
        X = frame[feat].to_numpy(dtype=float)
        y = frame[label_col].to_numpy(dtype=int)
        pipe = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="median")),
                ("scaler", StandardScaler()),
                ("clf", LogisticRegression(C=1.0, solver="lbfgs", max_iter=1000)),
            ]
        )
        pipe.fit(X, y)
        return cls(pipeline=pipe, features=feat, label_col=label_col)

    def predict_proba(self, frame: pd.DataFrame) -> np.ndarray:
        X = frame[self.features].to_numpy(dtype=float)
        return self.pipeline.predict_proba(X)[:, 1]

    def standardized_coefficients(self) -> dict[str, float]:
        """
        Feature name → standardised coefficient. Only features that survived
        imputation (i.e. had at least one non-null value in training) are
        returned, using the imputer's kept-feature indices.
        """
        clf = self.pipeline.named_steps["clf"]
        imputer = self.pipeline.named_steps["imputer"]
        # SimpleImputer drops all-NaN columns unless keep_empty_features=True.
        # Recover the surviving feature names by checking statistics_ (NaN where dropped).
        kept = [
            name for name, stat in zip(self.features, imputer.statistics_, strict=True) if not pd.isna(stat)
        ]
        coefs = clf.coef_[0].tolist()
        return dict(zip(kept, coefs, strict=True))
