"""Tests for features.py — focus on leakage and parsing correctness."""

from __future__ import annotations

import numpy as np
import pandas as pd

from f1_prediction import features


def _fake_raw(rows):
    return pd.DataFrame(rows)


def test_quali_to_seconds_handles_timedelta_and_nan():
    assert features._quali_to_seconds(pd.Timedelta(seconds=92.5)) == 92.5
    assert np.isnan(features._quali_to_seconds(None))
    assert np.isnan(features._quali_to_seconds(float("nan")))


def test_rolling_mean_before_does_not_include_current():
    s = pd.Series([10, 20, 30, 40])
    out = features._rolling_mean_before(s, window=2)
    assert pd.isna(out.iloc[0])      # no prior data
    assert out.iloc[1] == 10         # prior = [10]
    assert out.iloc[2] == 15         # prior = [10, 20]
    assert out.iloc[3] == 25         # prior = [20, 30]


def test_quali_gap_is_zero_for_pole_nonnegative_for_rest():
    df = pd.DataFrame(
        {
            "season": [2024, 2024, 2024],
            "round": [1, 1, 1],
            "quali_best_seconds": [91.0, 91.5, 92.0],
        }
    )
    out = features.add_quali_gap(df)
    assert out["quali_gap_to_pole"].tolist() == [0.0, 0.5, 1.0]


def test_driver_features_no_leakage_for_first_race():
    raw = pd.DataFrame(
        {
            "season": [2024, 2024],
            "round": [1, 2],
            "event_date": pd.to_datetime(["2024-03-02", "2024-03-09"]),
            "event_name": ["A", "B"],
            "Abbreviation": ["VER", "VER"],
            "TeamName": ["Red Bull", "Red Bull"],
            "GridPosition": [1.0, 1.0],
            "Position": [1.0, 3.0],
            "Points": [25, 15],
            "Q1": [pd.NaT, pd.NaT],
            "Q2": [pd.NaT, pd.NaT],
            "Q3": [pd.NaT, pd.NaT],
        }
    )
    out = features.build_features(raw)

    row1 = out[out["round"] == 1].iloc[0]
    row2 = out[out["round"] == 2].iloc[0]
    # First race: no prior data for driver-level rolling stats.
    assert pd.isna(row1["driver_points_last_3"])
    assert pd.isna(row1["driver_track_history"])  # first time at circuit A
    # Second race: prior = [race 1's 25 points]. Rolling mean = 25.
    assert row2["driver_points_last_3"] == 25.0


def test_team_features_aggregate_both_cars():
    raw = pd.DataFrame(
        {
            "season": [2024, 2024, 2024, 2024],
            "round": [1, 1, 2, 2],
            "event_date": pd.to_datetime(["2024-03-02"] * 2 + ["2024-03-09"] * 2),
            "event_name": ["A", "A", "B", "B"],
            "Abbreviation": ["VER", "PER", "VER", "PER"],
            "TeamName": ["Red Bull"] * 4,
            "GridPosition": [1.0, 5.0, 2.0, 4.0],
            "Position": [1.0, 2.0, 3.0, 4.0],
            "Points": [25, 18, 15, 12],
            "Q1": [pd.NaT] * 4, "Q2": [pd.NaT] * 4, "Q3": [pd.NaT] * 4,
        }
    )
    out = features.build_features(raw)
    # Race 1: team has no prior races → NaN
    # Race 2: team total from race 1 was 25+18 = 43. Rolling mean over last 1 race = 43.
    race2_rows = out[out["round"] == 2]
    assert (race2_rows["team_points_last_3"] == 43.0).all()


def test_feature_column_list_is_nonempty():
    assert len(features.FEATURES) >= 5
    # Sanity: every declared feature must be produced by build_features on real data shape.
    # (Not asserted here — exercised by test_train_features integration test.)
