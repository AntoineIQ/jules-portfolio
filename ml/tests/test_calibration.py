"""Tests for calibration module — ECE arithmetic."""

from __future__ import annotations

import numpy as np

from f1_prediction.calibration import expected_calibration_error


def test_ece_perfect_model():
    y = np.array([1, 1, 0, 0])
    p = np.array([1.0, 1.0, 0.0, 0.0])
    assert expected_calibration_error(y, p) == 0.0


def test_ece_maximally_uncalibrated():
    # Model says 1.0 but truth is always 0, and vice versa
    y = np.array([0, 0, 1, 1])
    p = np.array([1.0, 1.0, 0.0, 0.0])
    # ECE is mean absolute gap = 1.0
    assert expected_calibration_error(y, p, n_bins=2) == 1.0


def test_ece_half_baseline():
    # Always predicts 0.5, truth is 50/50
    y = np.array([0, 1] * 50)
    p = np.full(100, 0.5)
    # One bin (around 0.5) with predicted=0.5 and observed=0.5 → ECE=0
    assert expected_calibration_error(y, p) < 1e-9
