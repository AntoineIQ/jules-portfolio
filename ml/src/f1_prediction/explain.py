"""
SHAP explainability for the GBM.

SHAP values answer "for THIS prediction, how much did each feature push the
probability up or down, relative to the model's baseline?" They work
naturally on tree models via the exact TreeSHAP algorithm (fast, no
sampling required).

See docs/learning/06-shap.md for the intuition.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import shap

from f1_prediction.models.gbm import GbmModel


@dataclass
class ShapExplanation:
    """
    base_value: model's baseline log-odds (before any feature contribution).
    values:     (n_rows, n_features) array; each entry's contribution in log-odds.
    index:      the original DataFrame index for each row.
    """

    base_value: float
    values: pd.DataFrame

    @classmethod
    def from_gbm(cls, gbm: GbmModel, df: pd.DataFrame) -> "ShapExplanation":
        # IMPORTANT: use the feature list the GBM was actually trained on, not
        # the module-level race-points default. Otherwise targets with different
        # feature lists (H2H, quali_top10, etc.) crash with a feature-count
        # mismatch in the LightGBM booster.
        feature_list = gbm.features
        X = df[feature_list].to_numpy(dtype=float)
        explainer = shap.TreeExplainer(gbm.model)
        raw = explainer.shap_values(X)

        # shap returns either a numpy array (older) or shap.Explanation (newer).
        if hasattr(raw, "values"):
            matrix = np.asarray(raw.values)
            base = float(np.atleast_1d(raw.base_values).flatten()[0])
        else:
            matrix = np.asarray(raw)
            base_ev = explainer.expected_value
            base = float(np.atleast_1d(base_ev).flatten()[0])

        # Some SHAP versions for binary classifiers return shape (n_rows, n_features, 2);
        # in that case take the positive-class slice.
        if matrix.ndim == 3:
            matrix = matrix[:, :, 1]

        return cls(
            base_value=base,
            values=pd.DataFrame(matrix, columns=feature_list, index=df.index),
        )

    def top_k(self, row_index: int, k: int = 3) -> list[tuple[str, float]]:
        """(feature_name, log-odds contribution), sorted by absolute magnitude desc."""
        row = self.values.loc[row_index]
        ordered = row.reindex(row.abs().sort_values(ascending=False).index)
        return [(name, float(val)) for name, val in ordered.head(k).items()]

    def format_contributions(self, row_index: int, k: int = 3) -> str:
        """Human-readable one-line explanation for a single prediction."""
        parts = []
        for name, val in self.top_k(row_index, k):
            arrow = "↑" if val > 0 else "↓"
            parts.append(f"{name} {arrow}{abs(val):.2f}")
        return "  ·  ".join(parts)


def plot_summary(explanation: ShapExplanation, X: pd.DataFrame, out_path: Path) -> None:
    """Beeswarm-style SHAP summary plot saved to disk."""
    fig = plt.figure(figsize=(8, 5.5))
    shap.summary_plot(
        shap_values=explanation.values.to_numpy(),
        features=X[FEATURES].to_numpy(),
        feature_names=FEATURES,
        show=False,
        plot_size=None,
    )
    fig = plt.gcf()
    fig.tight_layout()
    fig.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close(fig)


def plot_waterfall(explanation: ShapExplanation, row_index: int, out_path: Path, title: str = "") -> None:
    """Per-row waterfall: base → feature contributions → final log-odds."""
    row_values = explanation.values.loc[row_index].to_numpy()
    # Order by absolute magnitude, descending
    order = np.argsort(np.abs(row_values))[::-1]
    ordered_values = row_values[order]
    ordered_names = [FEATURES[i] for i in order]

    starts = np.concatenate(([explanation.base_value], explanation.base_value + np.cumsum(ordered_values[:-1])))
    ends = starts + ordered_values

    fig, ax = plt.subplots(figsize=(8, 5))
    colors = ["tab:green" if v > 0 else "tab:red" for v in ordered_values]
    y_positions = np.arange(len(ordered_values))
    ax.barh(y_positions, ordered_values, left=starts, color=colors, edgecolor="black", linewidth=0.5)
    ax.set_yticks(y_positions)
    ax.set_yticklabels(ordered_names)
    ax.invert_yaxis()
    ax.axvline(explanation.base_value, color="grey", linestyle=":", linewidth=1, label=f"base = {explanation.base_value:.2f}")
    final = explanation.base_value + row_values.sum()
    ax.axvline(final, color="black", linestyle="-", linewidth=1.2, label=f"final = {final:.2f}")
    ax.set_xlabel("log-odds contribution")
    ax.set_title(title or "SHAP waterfall")
    ax.legend(loc="lower right")
    ax.grid(axis="x", alpha=0.3)
    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)
