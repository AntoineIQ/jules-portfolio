"""Tests for evaluate.py — target construction and splitting."""

from __future__ import annotations

import numpy as np
import pandas as pd

from f1_prediction.evaluate import (
    build_training_frame,
    evaluate_probabilities,
    time_split,
)


def _fake_raw(rows):
    return pd.DataFrame(rows)


def test_points_finish_target():
    raw = _fake_raw(
        [
            {"season": 2024, "round": 1, "event_date": "2024-03-02", "Abbreviation": "VER",
             "TeamName": "Red Bull", "GridPosition": 1.0, "Position": 1.0},
            {"season": 2024, "round": 1, "event_date": "2024-03-02", "Abbreviation": "MID",
             "TeamName": "Mid", "GridPosition": 10.0, "Position": 10.0},
            {"season": 2024, "round": 1, "event_date": "2024-03-02", "Abbreviation": "OUT",
             "TeamName": "Back", "GridPosition": 11.0, "Position": 11.0},
            {"season": 2024, "round": 1, "event_date": "2024-03-02", "Abbreviation": "DNF",
             "TeamName": "Back", "GridPosition": 15.0, "Position": float("nan")},
        ]
    )
    frame = build_training_frame(raw)
    assert frame.set_index("driver")["points_finish"].to_dict() == {
        "VER": 1,
        "MID": 1,  # P10 counts as points
        "OUT": 0,  # P11 does not
        "DNF": 0,  # DNF counts as no points
    }


def test_grid_position_zero_becomes_back_of_grid():
    raw = _fake_raw(
        [
            {"season": 2024, "round": 1, "event_date": "2024-03-02", "Abbreviation": "PIT",
             "TeamName": "X", "GridPosition": 0.0, "Position": 18.0},
        ]
    )
    frame = build_training_frame(raw)
    assert frame.loc[0, "grid_position"] == 20.0


def test_time_split_has_no_overlap():
    frame = pd.DataFrame(
        {
            "season": [2022, 2023, 2024, 2025],
            "round": [1, 1, 1, 1],
            "event_date": pd.to_datetime(["2022-01-01", "2023-01-01", "2024-01-01", "2025-01-01"]),
            "driver": ["A", "A", "A", "A"],
            "team": ["X"] * 4,
            "grid_position": [1, 1, 1, 1],
            "finish_position": [1, 1, 1, 1],
            "points_finish": [1, 1, 1, 1],
        }
    )
    train, test = time_split(frame, train_through_season=2024, test_season=2025)
    assert set(train["season"]) == {2022, 2023, 2024}
    assert set(test["season"]) == {2025}


def test_evaluate_probabilities_perfect_model():
    y = np.array([0, 1, 0, 1])
    p = np.array([0.01, 0.99, 0.01, 0.99])
    m = evaluate_probabilities(y, p, label="perfect")
    assert m["accuracy_at_0.5"] == 1.0
    assert m["brier"] < 0.001
