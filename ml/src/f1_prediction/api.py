"""FastAPI app exposing the slim live inference surface."""

from __future__ import annotations

from statistics import mean
from typing import Any

import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from f1_prediction import __version__
from f1_prediction.artifacts import load_manifest, load_model, load_race_payload


class RacePredictionRequest(BaseModel):
    season: int = Field(..., ge=2024)
    round: int = Field(..., ge=1)
    target: str


def create_app() -> FastAPI:
    app = FastAPI(title="Jules F1 Lab API", version=__version__)

    @app.get("/health")
    def health() -> dict[str, Any]:
        manifest = load_manifest()
        return {
            "status": "ok",
            "version": __version__,
            "model_version": manifest["model_version"],
            "generated_at": manifest["generated_at"],
        }

    @app.get("/version")
    def version() -> dict[str, Any]:
        manifest = load_manifest()
        return {
            "package_version": __version__,
            "model_version": manifest["model_version"],
            "generated_at": manifest["generated_at"],
        }

    @app.get("/metadata")
    def metadata() -> dict[str, Any]:
        return load_manifest()

    @app.post("/predict/race")
    def predict_race(request: RacePredictionRequest) -> dict[str, Any]:
        manifest = load_manifest()
        target_meta = manifest["targets"].get(request.target)
        if target_meta is None:
            raise HTTPException(status_code=404, detail=f"Unknown target '{request.target}'")

        try:
            payload = load_race_payload(request.season, request.round, request.target)
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

        model = load_model(request.target)
        frame = payload.to_frame()
        probs = model.predict_proba(frame)

        if len(probs) == 0:
            raise HTTPException(status_code=404, detail="No prediction rows found for requested race")

        top_index = int(np.argmax(probs))
        team_scores: dict[str, list[float]] = {}
        for row, prob in zip(payload.rows, probs, strict=True):
            team_scores.setdefault(row.team, []).append(float(prob))

        strongest_team = max(team_scores.items(), key=lambda item: mean(item[1]))
        return {
            "season": payload.season,
            "round": payload.round,
            "event_name": payload.event_name,
            "event_date": payload.event_date,
            "target": payload.target,
            "target_display": payload.target_display,
            "model": payload.model,
            "model_version": payload.model_version,
            "generated_at": payload.generated_at,
            "summary": {
                "top_driver": {
                    "driver": payload.rows[top_index].driver,
                    "team": payload.rows[top_index].team,
                    "p": float(probs[top_index]),
                },
                "strongest_team": {
                    "team": strongest_team[0],
                    "mean_p": float(mean(strongest_team[1])),
                },
                "field_average": float(np.mean(probs)),
                "prediction_spread": float(np.max(probs) - np.min(probs)),
            },
            "drivers": [
                {
                    "driver": row.driver,
                    "team": row.team,
                    "grid_position": row.grid_position,
                    "finish_position": row.finish_position,
                    "actual": row.actual,
                    "p": float(prob),
                    "top_factors": row.top_factors,
                }
                for row, prob in sorted(
                    zip(payload.rows, probs, strict=True),
                    key=lambda item: item[1],
                    reverse=True,
                )
            ],
        }

    return app


app = create_app()
