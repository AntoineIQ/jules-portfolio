from __future__ import annotations

import json
from datetime import UTC, datetime

import pytest

from f1_prediction import artifacts, publish


def _clear_artifact_caches() -> None:
    artifacts.load_manifest.cache_clear()
    artifacts.load_model.cache_clear()
    artifacts.load_race_payload.cache_clear()


@pytest.fixture(scope="session")
def published_bundle(tmp_path_factory: pytest.TempPathFactory) -> dict[str, object]:
    root = tmp_path_factory.mktemp("published-bundle")
    static_root = root / "static"
    artifact_root = root / "serving"

    original_static_root = publish.STATIC_ROOT
    original_publish_artifact_root = publish.ARTIFACT_ROOT
    original_runtime_artifact_root = artifacts.ARTIFACT_ROOT

    publish.STATIC_ROOT = static_root
    publish.ARTIFACT_ROOT = artifact_root
    artifacts.ARTIFACT_ROOT = artifact_root
    _clear_artifact_caches()

    generated_at = datetime.now(UTC).replace(microsecond=0).isoformat()
    model_version = "test-suite"

    try:
        publish.publish_all(model_version=model_version, generated_at=generated_at)
        static_manifest = json.loads((static_root / "manifest.json").read_text(encoding="utf-8"))
        season = 2025 if 2025 in static_manifest["seasons"] else static_manifest["seasons"][0]
        round_n = static_manifest["available_rounds"][str(season)][-1]
        yield {
            "static_root": static_root,
            "artifact_root": artifact_root,
            "generated_at": generated_at,
            "model_version": model_version,
            "request": {
                "season": season,
                "round": round_n,
                "target": static_manifest["primary_target"],
            },
            "static_manifest": static_manifest,
        }
    finally:
        publish.STATIC_ROOT = original_static_root
        publish.ARTIFACT_ROOT = original_publish_artifact_root
        artifacts.ARTIFACT_ROOT = original_runtime_artifact_root
        _clear_artifact_caches()
