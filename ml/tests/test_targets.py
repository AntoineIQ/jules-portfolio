"""Smoke tests for the multi-target frame."""

from __future__ import annotations

from f1_prediction.targets import (
    TARGETS,
    build_multi_target_frame,
    prepare_target_frame,
)


def test_all_seven_targets_defined():
    assert set(TARGETS) == {
        "race_points",
        "quali_top10",
        "sprint_points",
        "sprint_grid_top5",
        "race_podium",
        "race_winner",
        "h2h_beats_teammate",
    }


def test_unified_frame_has_every_label_column():
    frame = build_multi_target_frame()
    for t in TARGETS.values():
        assert t.label_col in frame.columns, f"missing {t.label_col}"


def test_unified_frame_has_every_feature_column():
    frame = build_multi_target_frame()
    for t in TARGETS.values():
        for feat in t.features:
            assert feat in frame.columns, f"missing feature {feat} for target {t.name}"


def test_sprint_target_frame_is_nonempty_but_smaller_than_race():
    frame = build_multi_target_frame()
    race = prepare_target_frame(TARGETS["race_points"], frame=frame)
    sprint = prepare_target_frame(TARGETS["sprint_points"], frame=frame)
    assert len(race) > 0
    assert 0 < len(sprint) < len(race), "sprint frame should be non-empty but smaller than race"
