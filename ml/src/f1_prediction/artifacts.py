"""
Serving artifact IO helpers.

The public website should be able to call a live model without dragging the
entire research stack into the serving runtime. These helpers load a slim set
of precomputed artifacts written by the publish pipeline:

- one trained model per target
- one race payload per (season, round, target) for live inference inputs
- a manifest with version and availability metadata
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import pandas as pd


ML_ROOT = Path(__file__).resolve().parents[2]
ARTIFACT_ROOT = ML_ROOT / "artifacts" / "serving"


@dataclass(frozen=True)
class ServingRow:
    driver: str
    team: str
    grid_position: int | None
    finish_position: int | None
    actual: int | None
    top_factors: list[dict[str, float | str]]
    feature_values: dict[str, float | None]


@dataclass(frozen=True)
class ServingRacePayload:
    season: int
    round: int
    event_name: str
    event_date: str
    target: str
    target_display: str
    model: str
    model_version: str
    generated_at: str
    features: list[str]
    explanation_kind: str
    rows: list[ServingRow]

    def to_frame(self) -> pd.DataFrame:
        return pd.DataFrame([row.feature_values for row in self.rows], columns=self.features)


def artifact_path(*parts: str) -> Path:
    return ARTIFACT_ROOT.joinpath(*parts)


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2))


@lru_cache(maxsize=1)
def load_manifest() -> dict[str, Any]:
    path = artifact_path("manifest.json")
    if not path.exists():
        raise FileNotFoundError(f"Serving manifest not found at {path}")
    return json.loads(path.read_text())


@lru_cache(maxsize=16)
def load_model(target_name: str) -> Any:
    path = artifact_path("models", f"{target_name}.joblib")
    if not path.exists():
        raise FileNotFoundError(f"Serving model not found for target '{target_name}' at {path}")
    return joblib.load(path)


@lru_cache(maxsize=128)
def load_race_payload(season: int, round_n: int, target_name: str) -> ServingRacePayload:
    path = artifact_path("races", str(season), f"{round_n:02d}", f"{target_name}.json")
    if not path.exists():
        raise FileNotFoundError(
            f"Serving race payload not found for season={season} round={round_n} target={target_name}"
        )
    raw = json.loads(path.read_text())
    return ServingRacePayload(
        season=int(raw["season"]),
        round=int(raw["round"]),
        event_name=str(raw["event_name"]),
        event_date=str(raw["event_date"]),
        target=str(raw["target"]),
        target_display=str(raw["target_display"]),
        model=str(raw["model"]),
        model_version=str(raw["model_version"]),
        generated_at=str(raw["generated_at"]),
        features=[str(feature) for feature in raw["features"]],
        explanation_kind=str(raw["explanation_kind"]),
        rows=[
            ServingRow(
                driver=str(row["driver"]),
                team=str(row["team"]),
                grid_position=None if row["grid_position"] is None else int(row["grid_position"]),
                finish_position=None if row["finish_position"] is None else int(row["finish_position"]),
                actual=None if row["actual"] is None else int(row["actual"]),
                top_factors=[
                    {"feature": str(item["feature"]), "value": float(item["value"])}
                    for item in row["top_factors"]
                ],
                feature_values={
                    str(key): None if value is None else float(value)
                    for key, value in row["feature_values"].items()
                },
            )
            for row in raw["rows"]
        ],
    )
