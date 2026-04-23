from __future__ import annotations

import numpy as np

from f1_prediction.artifacts import load_manifest, load_model, load_race_payload


def test_publish_roundtrip_creates_loadable_serving_bundle(
    published_bundle: dict[str, object],
) -> None:
    request = published_bundle["request"]
    assert isinstance(request, dict)

    manifest = load_manifest()
    payload = load_race_payload(request["season"], request["round"], request["target"])
    model = load_model(request["target"])
    probabilities = model.predict_proba(payload.to_frame())

    assert manifest["model_version"] == published_bundle["model_version"]
    assert payload.rows
    assert len(probabilities) == len(payload.rows)
    assert np.isfinite(probabilities).all()
    assert np.logical_and(probabilities >= 0.0, probabilities <= 1.0).all()
    assert any(row.top_factors for row in payload.rows)
