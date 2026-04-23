"""Tests for SHAP explainer — uses a small real model to avoid mocking out SHAP."""

from __future__ import annotations

import pandas as pd

from f1_prediction.evaluate import load_results, time_split
from f1_prediction.explain import ShapExplanation
from f1_prediction.features import FEATURES, build_features
from f1_prediction.models.gbm import GbmModel


def test_shap_shape_matches_input():
    frame = build_features(load_results())
    train, test = time_split(frame, train_through_season=2024, test_season=2025)
    gbm = GbmModel.fit(train)
    explanation = ShapExplanation.from_gbm(gbm, test.head(20))
    assert explanation.values.shape == (20, len(FEATURES))


def test_top_k_contains_existing_features():
    frame = build_features(load_results())
    train, test = time_split(frame, train_through_season=2024, test_season=2025)
    gbm = GbmModel.fit(train)
    head = test.head(5)
    explanation = ShapExplanation.from_gbm(gbm, head)
    for idx in head.index:
        pairs = explanation.top_k(idx, k=3)
        assert len(pairs) == 3
        for name, _ in pairs:
            assert name in FEATURES
