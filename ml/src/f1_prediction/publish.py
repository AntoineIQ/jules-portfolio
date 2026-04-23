"""
Publish pipeline for the monorepo.

Outputs two synchronized surfaces:

1. Static JSON for the Next.js site under apps/web/public/data/f1
2. Slim serving artifacts for the live FastAPI inference API under ml/artifacts/serving
"""

from __future__ import annotations

import json
import logging
import subprocess
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
import typer

from f1_prediction.artifacts import ARTIFACT_ROOT, write_json
from f1_prediction.calibration import expected_calibration_error
from f1_prediction.evaluate import evaluate_probabilities
from f1_prediction.explain import ShapExplanation
from f1_prediction.models.baseline import GridPositionBaseline
from f1_prediction.models.gbm import GbmModel, load_tuned_params
from f1_prediction.models.linear import FeaturesLogit
from f1_prediction.targets import TARGETS, Target, build_multi_target_frame, prepare_target_frame


logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

ML_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = Path(__file__).resolve().parents[3]
WEB_ROOT = REPO_ROOT / "apps" / "web"
STATIC_ROOT = WEB_ROOT / "public" / "data" / "f1"
PUBLIC_SEASONS = (2024, 2025, 2026)
PRIMARY_TARGET = "race_points"

# Best-model-per-target, carried from the evaluation phase.
BEST_MODEL = {
    "race_points": "gbm",
    "race_podium": "gbm",
    "race_winner": "gbm",
    "quali_top10": "features_logit",
    "sprint_points": "features_logit",
    "sprint_grid_top5": "features_logit",
    "h2h_beats_teammate": "gbm",
}

app = typer.Typer(add_completion=False)


def _utc_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()


def _model_version() -> str:
    try:
        output = subprocess.check_output(
            ["git", "-C", str(REPO_ROOT), "rev-parse", "--short", "HEAD"],
            text=True,
            stderr=subprocess.DEVNULL,
        )
        return output.strip() or "working-tree"
    except Exception:  # noqa: BLE001
        return datetime.now(UTC).strftime("local-%Y%m%d%H%M%S")


def _fit_model(target_name: str, target: Target, train: pd.DataFrame) -> tuple[str, Any]:
    model_name = BEST_MODEL[target_name]
    if model_name == "gbm":
        tuned = load_tuned_params(target_name) or {}
        train = train.copy()
        train["_target_"] = train[target.label_col].astype(int)
        return model_name, GbmModel.fit(train, features=target.features, label_col="_target_", **tuned)
    if model_name == "features_logit":
        train = train.copy()
        train["_target_"] = train[target.label_col].astype(int)
        return model_name, FeaturesLogit.fit(train, features=target.features, label_col="_target_")
    train = train.copy()
    train["points_finish"] = train[target.label_col].astype(int)
    return model_name, GridPositionBaseline.fit(train)


def _predict(model_name: str, model: Any, df: pd.DataFrame) -> np.ndarray:
    if model_name in {"gbm", "features_logit"}:
        return model.predict_proba(df)
    return model.predict_proba(df)


def _top_factors(model_name: str, model: Any, target: Target, df: pd.DataFrame) -> dict[int, list[dict[str, Any]]]:
    if df.empty:
        return {}
    if model_name == "gbm":
        explanation = ShapExplanation.from_gbm(model, df)
        return {
            int(idx): [{"feature": feature, "value": float(value)} for feature, value in explanation.top_k(idx, k=3)]
            for idx in df.index
        }
    if model_name == "features_logit":
        imputer = model.pipeline.named_steps["imputer"]
        scaler = model.pipeline.named_steps["scaler"]
        clf = model.pipeline.named_steps["clf"]
        kept_features = [
            name for name, stat in zip(model.features, imputer.statistics_, strict=True) if not pd.isna(stat)
        ]
        X = df[target.features].to_numpy(dtype=float)
        X_imputed = imputer.transform(X)
        X_scaled = scaler.transform(X_imputed)
        contribs = X_scaled * clf.coef_[0]
        out: dict[int, list[dict[str, Any]]] = {}
        for offset, row_index in enumerate(df.index):
            series = pd.Series(contribs[offset], index=kept_features)
            ordered = series.reindex(series.abs().sort_values(ascending=False).index).head(3)
            out[int(row_index)] = [
                {"feature": str(feature), "value": float(value)} for feature, value in ordered.items()
            ]
        return out
    clf = model.clf
    coef = float(clf.coef_[0][0])
    out = {}
    for row_index, row in df.iterrows():
        grid_value = None if pd.isna(row.get("grid_position")) else float(row["grid_position"])
        out[int(row_index)] = [{"feature": "grid_position", "value": 0.0 if grid_value is None else coef * grid_value}]
    return out


def _season_cells(df: pd.DataFrame, target_name: str, target: Target, season: int, model_name: str) -> dict[str, Any]:
    test = df[df["season"] == season].copy()
    if test.empty:
        return {
            "season": season,
            "target": target_name,
            "target_display": target.display,
            "model": model_name,
            "metrics": {},
            "drivers": [],
            "races": [],
            "cells": [],
            "highlights": [],
        }

    drivers_df = (
        test.groupby(["driver", "team"], as_index=False)["p"]
        .size()
        .sort_values(["team", "driver"])
    )
    races_df = (
        test.groupby(["round", "event_name", "event_date"], as_index=False)["p"]
        .size()
        .sort_values("round")
    )
    highlights = (
        test.assign(error=(test["p"] - test["actual"]).abs())
        .sort_values("error", ascending=False)
        .head(8)
    )
    y_true = test["actual"].to_numpy()
    y_prob = test["p"].to_numpy()
    metrics = evaluate_probabilities(y_true, y_prob, label=f"{target_name}_{season}")
    metrics["ece"] = expected_calibration_error(y_true, y_prob)

    return {
        "season": season,
        "target": target_name,
        "target_display": target.display,
        "model": model_name,
        "metrics": metrics,
        "drivers": [
            {"driver": str(row.driver), "team": str(row.team)}
            for _, row in drivers_df.iterrows()
        ],
        "races": [
            {
                "round": int(row["round"]),
                "event_name": str(row.event_name),
                "event_date": pd.to_datetime(row.event_date).strftime("%Y-%m-%d"),
            }
            for _, row in races_df.iterrows()
        ],
        "cells": [
            {
                "driver": str(row.driver),
                "team": str(row.team),
                "round": int(row["round"]),
                "p": float(row.p),
                "actual": int(row.actual),
                "surprise": float(abs(row.p - row.actual)),
                "grid_position": None if pd.isna(row.grid_position) else int(row.grid_position),
                "finish_position": None if pd.isna(row.finish_position) else int(row.finish_position),
            }
            for _, row in test.iterrows()
        ],
        "highlights": [
            {
                "driver": str(row.driver),
                "team": str(row.team),
                "round": int(row["round"]),
                "event_name": str(row.event_name),
                "p": float(row.p),
                "actual": int(row.actual),
                "surprise": float(row.error),
            }
            for _, row in highlights.iterrows()
        ],
    }


def _reliability_payload(test: pd.DataFrame, target_name: str, model_name: str, n_bins: int = 10) -> dict[str, Any]:
    edges = np.linspace(0, 1, n_bins + 1)
    bin_ids = np.clip(np.digitize(test["p"].to_numpy(), edges) - 1, 0, n_bins - 1)
    bins = []
    for b in range(n_bins):
        mask = bin_ids == b
        if not mask.any():
            bins.append(
                {
                    "bin": b,
                    "lo": float(edges[b]),
                    "hi": float(edges[b + 1]),
                    "n": 0,
                    "mean_pred": None,
                    "frac_pos": None,
                }
            )
            continue
        bins.append(
            {
                "bin": b,
                "lo": float(edges[b]),
                "hi": float(edges[b + 1]),
                "n": int(mask.sum()),
                "mean_pred": float(test["p"][mask].mean()),
                "frac_pos": float(test["actual"][mask].mean()),
            }
        )
    surprises = (
        test.assign(error=(test["p"] - test["actual"]).abs())
        .sort_values("error", ascending=False)
        .head(12)
    )
    return {
        "target": target_name,
        "model": model_name,
        "bins": bins,
        "surprises": [
            {
                "driver": str(row.driver),
                "team": str(row.team),
                "round": int(row["round"]),
                "event_name": str(row.event_name),
                "p": float(row.p),
                "actual": int(row.actual),
                "surprise": float(row.error),
            }
            for _, row in surprises.iterrows()
        ],
    }


def _race_payload(
    df: pd.DataFrame,
    target_name: str,
    target: Target,
    season: int,
    round_n: int,
    model_name: str,
    top_factors: dict[int, list[dict[str, Any]]],
    explanation_kind: str,
    model_version: str,
    generated_at: str,
) -> dict[str, Any]:
    race = df[(df["season"] == season) & (df["round"] == round_n)].copy()
    if race.empty:
        return {}

    event_name = str(race["event_name"].iloc[0])
    event_date = pd.to_datetime(race["event_date"].iloc[0]).strftime("%Y-%m-%d")
    y_true = race["actual"].to_numpy()
    y_prob = race["p"].to_numpy()
    metrics = evaluate_probabilities(y_true, y_prob, label=f"{target_name}_{season}_{round_n}")
    metrics["ece"] = expected_calibration_error(y_true, y_prob)

    race = race.sort_values("p", ascending=False).reset_index(drop=False)
    top_driver = race.iloc[0]
    team_summary = (
        race.groupby("team", as_index=False)["p"]
        .mean()
        .sort_values("p", ascending=False)
        .iloc[0]
    )
    return {
        "season": season,
        "round": round_n,
        "event_name": event_name,
        "event_date": event_date,
        "target": target_name,
        "target_display": target.display,
        "model": model_name,
        "model_version": model_version,
        "generated_at": generated_at,
        "metrics": metrics,
        "summary": {
            "top_driver": {
                "driver": str(top_driver.driver),
                "team": str(top_driver.team),
                "p": float(top_driver.p),
            },
            "strongest_team": {
                "team": str(team_summary.team),
                "mean_p": float(team_summary.p),
            },
            "field_average": float(race["p"].mean()),
            "prediction_spread": float(race["p"].max() - race["p"].min()),
        },
        "drivers": [
            {
                "driver": str(row.driver),
                "team": str(row.team),
                "grid_position": None if pd.isna(row.grid_position) else int(row.grid_position),
                "p": float(row.p),
                "actual": int(row.actual),
                "finish_position": None if pd.isna(row.finish_position) else int(row.finish_position),
                "top_factors": top_factors.get(int(row["index"]), []),
                "explanation_kind": explanation_kind,
            }
            for _, row in race.iterrows()
        ],
    }


def _metric_summary(frame: pd.DataFrame) -> dict[str, Any]:
    targets: dict[str, Any] = {}
    for target_name, target in TARGETS.items():
        usable = prepare_target_frame(target, frame=frame)
        train = usable[usable["season"] <= 2024].copy()
        test = usable[usable["season"] == 2025].copy()
        if train.empty or test.empty:
            continue
        model_name, model = _fit_model(target_name, target, train)
        probs = _predict(model_name, model, test)
        y_true = test[target.label_col].astype(int).to_numpy()
        base_rate = float(y_true.mean())
        clipped = float(np.clip(base_rate, 1e-7, 1 - 1e-7))
        floor_ll = (
            -(base_rate * np.log(clipped) + (1 - base_rate) * np.log(float(np.clip(1 - base_rate, 1e-7, 1 - 1e-7))))
            if 0 < base_rate < 1
            else 0.0
        )
        metrics = evaluate_probabilities(y_true, probs, label=target_name)
        metrics["ece"] = expected_calibration_error(y_true, probs)
        metrics["base_rate_log_loss"] = float(floor_ll)
        metrics["reduction_vs_floor"] = float((floor_ll - metrics["log_loss"]) / floor_ll) if floor_ll > 0 else 0.0
        metrics["model"] = model_name
        metrics["display"] = target.display
        targets[target_name] = metrics
    return {"targets": targets}


def _export_static(frame: pd.DataFrame, model_version: str, generated_at: str) -> dict[str, Any]:
    logger.info("Exporting static site payloads")
    STATIC_ROOT.mkdir(parents=True, exist_ok=True)
    metrics = _metric_summary(frame)
    insights_index: dict[int, dict[str, Any]] = {
        season: {"season": season, "generated_at": generated_at, "model_version": model_version, "targets": {}}
        for season in PUBLIC_SEASONS
    }

    manifest_targets: dict[str, Any] = {}
    available_rounds: dict[int, list[int]] = {}

    for target_name, target in TARGETS.items():
        manifest_targets[target_name] = {
            "name": target_name,
            "display": target.display,
            "model": BEST_MODEL[target_name],
            "metrics": metrics["targets"].get(target_name),
            "seasons": [],
        }
        usable = prepare_target_frame(target, frame=frame)
        for season in PUBLIC_SEASONS:
            train = usable[usable["season"] < season].copy()
            test = usable[usable["season"] == season].copy()
            if train.empty or test.empty:
                continue
            model_name, model = _fit_model(target_name, target, train)
            test = test.copy()
            test["p"] = _predict(model_name, model, test)
            test["actual"] = test[target.label_col].astype(int)
            factors = _top_factors(model_name, model, target, test)
            explanation_kind = "shap" if model_name == "gbm" else "linear"
            season_payload = _season_cells(test, target_name, target, season, model_name)
            season_payload["model_version"] = model_version
            season_payload["generated_at"] = generated_at
            season_path = STATIC_ROOT / "seasons" / str(season) / f"{target_name}.json"
            write_json(season_path, season_payload)

            rounds = sorted(test["round"].dropna().astype(int).unique().tolist())
            available_rounds.setdefault(season, rounds)
            manifest_targets[target_name]["seasons"].append(season)
            insights_index[season]["targets"][target_name] = {
                "model": model_name,
                "metrics": season_payload["metrics"],
                "highlights": season_payload["highlights"][:5],
            }
            if target_name == PRIMARY_TARGET:
                insights_index[season]["reliability"] = _reliability_payload(test, target_name, model_name)

            for round_n in rounds:
                race_payload = _race_payload(
                    test,
                    target_name,
                    target,
                    season,
                    round_n,
                    model_name,
                    factors,
                    explanation_kind,
                    model_version,
                    generated_at,
                )
                race_path = STATIC_ROOT / "races" / str(season) / f"{round_n:02d}" / f"{target_name}.json"
                write_json(race_path, race_payload)

    for season, payload in insights_index.items():
        write_json(STATIC_ROOT / "insights" / f"{season}.json", payload)

    manifest = {
        "generated_at": generated_at,
        "model_version": model_version,
        "primary_target": PRIMARY_TARGET,
        "seasons": list(PUBLIC_SEASONS),
        "available_rounds": {str(season): rounds for season, rounds in sorted(available_rounds.items())},
        "targets": manifest_targets,
    }
    write_json(STATIC_ROOT / "manifest.json", manifest)
    return manifest


def _row_feature_values(row: pd.Series, features: list[str]) -> dict[str, float | None]:
    payload: dict[str, float | None] = {}
    for feature in features:
        value = row.get(feature)
        payload[feature] = None if pd.isna(value) else float(value)
    return payload


def _export_serving(frame: pd.DataFrame, model_version: str, generated_at: str) -> dict[str, Any]:
    logger.info("Exporting serving artifacts")
    ARTIFACT_ROOT.mkdir(parents=True, exist_ok=True)
    targets_manifest: dict[str, Any] = {}

    for target_name, target in TARGETS.items():
        usable = prepare_target_frame(target, frame=frame)
        if usable.empty:
            continue
        production_train = usable.copy()
        model_name, model = _fit_model(target_name, target, production_train)
        model_path = ARTIFACT_ROOT / "models" / f"{target_name}.joblib"
        model_path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(model, model_path)
        explanation_kind = "shap" if model_name == "gbm" else "linear"
        targets_manifest[target_name] = {
            "display": target.display,
            "model": model_name,
            "features": target.features,
            "explanation_kind": explanation_kind,
            "trained_through_season": int(production_train["season"].max()),
        }

        public_rows = usable[usable["season"].isin(PUBLIC_SEASONS)].copy()
        if public_rows.empty:
            continue
        public_rows["p"] = _predict(model_name, model, public_rows)
        public_rows["actual"] = public_rows[target.label_col].astype(int)
        factors = _top_factors(model_name, model, target, public_rows)

        for (season, round_n), race in public_rows.groupby(["season", "round"], sort=True):
            event_name = str(race["event_name"].iloc[0])
            event_date = pd.to_datetime(race["event_date"].iloc[0]).strftime("%Y-%m-%d")
            payload = {
                "season": int(season),
                "round": int(round_n),
                "event_name": event_name,
                "event_date": event_date,
                "target": target_name,
                "target_display": target.display,
                "model": model_name,
                "model_version": model_version,
                "generated_at": generated_at,
                "features": target.features,
                "explanation_kind": explanation_kind,
                "rows": [
                    {
                        "driver": str(row.driver),
                        "team": str(row.team),
                        "grid_position": None if pd.isna(row.grid_position) else int(row.grid_position),
                        "finish_position": None if pd.isna(row.finish_position) else int(row.finish_position),
                        "actual": int(row.actual),
                        "top_factors": factors.get(int(row_index), []),
                        "feature_values": _row_feature_values(row, target.features),
                    }
                    for row_index, row in race.iterrows()
                ],
            }
            write_json(ARTIFACT_ROOT / "races" / str(int(season)) / f"{int(round_n):02d}" / f"{target_name}.json", payload)

    manifest = {
        "generated_at": generated_at,
        "model_version": model_version,
        "seasons": list(PUBLIC_SEASONS),
        "targets": targets_manifest,
    }
    write_json(ARTIFACT_ROOT / "manifest.json", manifest)
    return manifest


def publish_all(
    *,
    write_static: bool = True,
    write_serving: bool = True,
    model_version: str | None = None,
    generated_at: str | None = None,
) -> dict[str, Any]:
    generated_at = generated_at or _utc_now()
    model_version = model_version or _model_version()
    frame = build_multi_target_frame()
    logger.info("Built unified frame with %s rows", len(frame))

    outputs: dict[str, Any] = {}
    if write_static:
        outputs["static"] = _export_static(frame, model_version=model_version, generated_at=generated_at)
    if write_serving:
        outputs["serving"] = _export_serving(frame, model_version=model_version, generated_at=generated_at)

    logger.info("Publish complete")
    return outputs


@app.command()
def main(
    write_static: bool = typer.Option(True, help="Write site payloads into apps/web/public/data/f1"),
    write_serving: bool = typer.Option(True, help="Write slim serving artifacts into ml/artifacts/serving"),
) -> None:
    publish_all(write_static=write_static, write_serving=write_serving)


if __name__ == "__main__":
    app()
