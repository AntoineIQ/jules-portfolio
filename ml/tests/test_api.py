from __future__ import annotations

import numpy as np
import pytest
from fastapi.testclient import TestClient

from f1_prediction import api
from f1_prediction.artifacts import ServingRacePayload, ServingRow, load_manifest


@pytest.fixture
def client(published_bundle: dict[str, object]) -> TestClient:
    with TestClient(api.create_app()) as test_client:
        yield test_client


def test_health_reports_current_bundle(client: TestClient, published_bundle: dict[str, object]) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["model_version"] == published_bundle["model_version"]


def test_metadata_exposes_targets(client: TestClient) -> None:
    response = client.get("/metadata")

    assert response.status_code == 200
    payload = response.json()
    assert payload["targets"]
    assert "race_points" in payload["targets"]


def test_predict_race_returns_ranked_drivers(
    client: TestClient,
    published_bundle: dict[str, object],
) -> None:
    request = published_bundle["request"]
    assert isinstance(request, dict)

    response = client.post("/predict/race", json=request)

    assert response.status_code == 200
    payload = response.json()
    assert payload["season"] == request["season"]
    assert payload["round"] == request["round"]
    assert payload["target"] == request["target"]
    assert payload["drivers"]
    assert payload["drivers"][0]["p"] >= payload["drivers"][-1]["p"]
    assert payload["summary"]["top_driver"]["driver"] == payload["drivers"][0]["driver"]


def test_predict_race_rejects_unknown_target(client: TestClient) -> None:
    response = client.post(
        "/predict/race",
        json={"season": 2025, "round": 24, "target": "does_not_exist"},
    )

    assert response.status_code == 404
    assert "Unknown target" in response.json()["detail"]


def test_predict_race_rejects_unknown_race(client: TestClient) -> None:
    response = client.post(
        "/predict/race",
        json={"season": 2025, "round": 99, "target": "race_points"},
    )

    assert response.status_code == 404
    assert "Serving race payload not found" in response.json()["detail"]


def test_predict_race_handles_empty_payload(monkeypatch: pytest.MonkeyPatch, client: TestClient) -> None:
    class EmptyModel:
        def predict_proba(self, frame):  # noqa: ANN001
            return np.array([])

    manifest = load_manifest()

    def fake_payload(season: int, round_n: int, target_name: str) -> ServingRacePayload:
        return ServingRacePayload(
            season=season,
            round=round_n,
            event_name="Synthetic Grand Prix",
            event_date="2026-01-01",
            target=target_name,
            target_display=manifest["targets"][target_name]["display"],
            model=manifest["targets"][target_name]["model"],
            model_version=manifest["model_version"],
            generated_at=manifest["generated_at"],
            features=["grid_position"],
            explanation_kind="linear",
            rows=[
                ServingRow(
                    driver="Nobody",
                    team="No Team",
                    grid_position=1,
                    finish_position=None,
                    actual=None,
                    top_factors=[],
                    feature_values={"grid_position": 1.0},
                )
            ],
        )

    monkeypatch.setattr(api, "load_model", lambda target_name: EmptyModel())
    monkeypatch.setattr(api, "load_race_payload", fake_payload)

    response = client.post(
        "/predict/race",
        json={"season": 2026, "round": 1, "target": "race_points"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "No prediction rows found for requested race"
