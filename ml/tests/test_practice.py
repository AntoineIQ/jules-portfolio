"""Tests for practice-session loading + feature computation."""

from __future__ import annotations

import pandas as pd

from f1_prediction import features


def test_load_practice_empty_dir(tmp_path):
    empty = tmp_path / "empty"
    empty.mkdir()
    out = features.load_practice(empty)
    assert list(out.columns) == [
        "season",
        "round",
        "driver",
        "fp_best_seconds",
        "fp_long_run_seconds",
        "fp_total_laps",
    ]
    assert len(out) == 0


def test_add_practice_gaps_computes_per_race():
    df = pd.DataFrame(
        {
            "season": [2024, 2024, 2024, 2024],
            "round": [1, 1, 1, 1],
            "driver": ["VER", "NOR", "PIA", "HAM"],
            "fp_best_seconds": [90.0, 90.5, 91.2, float("nan")],
            "fp_long_run_seconds": [95.0, 96.0, 95.5, 97.0],
        }
    )
    from pytest import approx
    out = features.add_practice_gaps(df)
    # Fastest best = 90.0 (VER); fastest long run = 95.0 (VER)
    assert out.loc[0, "fp_best_gap_to_fastest"] == approx(0.0)
    assert out.loc[1, "fp_best_gap_to_fastest"] == approx(0.5)
    assert out.loc[2, "fp_best_gap_to_fastest"] == approx(1.2)
    assert pd.isna(out.loc[3, "fp_best_gap_to_fastest"])
    assert out.loc[0, "fp_long_run_gap_to_fastest"] == approx(0.0)
    assert out.loc[2, "fp_long_run_gap_to_fastest"] == approx(0.5)


def test_add_practice_gaps_missing_columns_fills_nan():
    df = pd.DataFrame(
        {"season": [2024], "round": [1], "driver": ["VER"]}
    )
    out = features.add_practice_gaps(df)
    assert pd.isna(out.loc[0, "fp_best_gap_to_fastest"])
    assert pd.isna(out.loc[0, "fp_long_run_gap_to_fastest"])
