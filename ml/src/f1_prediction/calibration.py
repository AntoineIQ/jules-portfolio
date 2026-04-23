"""
Calibration diagnostics and reliability diagrams.

Calibration answers: "when the model says 70% chance, does it actually
happen about 70% of the time?" That's different from accuracy. A model
can be accurate but over-confident, or slightly less accurate but
produce trustworthy probabilities.

See docs/learning/05-calibration.md.
"""

from __future__ import annotations

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from sklearn.calibration import calibration_curve


def expected_calibration_error(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    n_bins: int = 10,
) -> float:
    """
    Expected Calibration Error — weighted mean |predicted − observed| over
    equal-width probability bins. Lower is better. 0 = perfectly calibrated.
    """
    y_true = np.asarray(y_true)
    y_prob = np.asarray(y_prob)
    edges = np.linspace(0.0, 1.0, n_bins + 1)
    bin_ids = np.clip(np.digitize(y_prob, edges) - 1, 0, n_bins - 1)

    ece = 0.0
    n = len(y_prob)
    for b in range(n_bins):
        mask = bin_ids == b
        if not mask.any():
            continue
        bin_predicted = y_prob[mask].mean()
        bin_observed = y_true[mask].mean()
        weight = mask.sum() / n
        ece += weight * abs(bin_predicted - bin_observed)
    return float(ece)


def plot_reliability_diagram(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    out_path: Path,
    title: str = "Reliability diagram",
    n_bins: int = 10,
    strategy: str = "quantile",
) -> None:
    """
    Save a reliability diagram comparing the model's predicted probabilities
    against the observed frequencies in quantile bins.

    A perfectly calibrated model would trace the diagonal.
    """
    frac_pos, mean_pred = calibration_curve(
        y_true, y_prob, n_bins=n_bins, strategy=strategy
    )

    fig, ax = plt.subplots(figsize=(6, 6))
    ax.plot([0, 1], [0, 1], "k:", linewidth=1.5, label="perfectly calibrated")
    ax.plot(mean_pred, frac_pos, "o-", color="tab:blue", linewidth=2, markersize=8, label="model")
    ax.set_xlabel("mean predicted probability (per bin)")
    ax.set_ylabel("fraction of positives observed (per bin)")
    ax.set_title(title)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.grid(alpha=0.3)
    ax.legend(loc="upper left")
    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)


def plot_reliability_comparison(
    y_true: np.ndarray,
    models: dict[str, np.ndarray],
    out_path: Path,
    title: str = "Reliability — model comparison",
    n_bins: int = 10,
) -> None:
    """One diagram with multiple model curves overlaid."""
    fig, ax = plt.subplots(figsize=(7, 6))
    ax.plot([0, 1], [0, 1], "k:", linewidth=1.5, label="perfectly calibrated")
    for name, y_prob in models.items():
        frac_pos, mean_pred = calibration_curve(y_true, y_prob, n_bins=n_bins, strategy="quantile")
        ax.plot(mean_pred, frac_pos, "o-", linewidth=2, markersize=6, label=name)
    ax.set_xlabel("mean predicted probability (per bin)")
    ax.set_ylabel("fraction of positives observed (per bin)")
    ax.set_title(title)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.grid(alpha=0.3)
    ax.legend(loc="upper left")
    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)
