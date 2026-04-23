# F1 Lab ML Service

This package now powers two synchronized outputs inside the monorepo:

- static JSON payloads for `apps/web/public/data/f1`
- slim serving artifacts plus a FastAPI runtime for live inference

## Local commands

```bash
cd ml
uv sync --extra train --extra dev
uv run python -m f1_prediction.ingest --year 2026
uv run python -m f1_prediction.publish
uv run uvicorn app.main:app --reload
uv run pytest -q
```

## Key entry points

- `src/f1_prediction/ingest.py` pulls and normalizes source data
- `src/f1_prediction/publish.py` trains the current best model per target and exports both web and serving outputs
- `src/f1_prediction/api.py` exposes `/health`, `/version`, `/metadata`, and `/predict/race`
- `src/f1_prediction/scripts/generate_workflow.py` rebuilds the post-session refresh schedule

## Layout

```text
ml/
├── app/main.py                  FastAPI app entry point
├── artifacts/serving/           committed serving bundle for the live API
├── data/                        raw and derived F1 data
├── src/f1_prediction/
│   ├── api.py                   live inference API
│   ├── artifacts.py             serving artifact IO
│   ├── ingest.py                FastF1 ingestion
│   ├── publish.py               monorepo export pipeline
│   ├── scripts/generate_workflow.py
│   └── models/                  best-model implementations
└── tests/                       unit and integration coverage
```

## Deploy

- Railway can build this service directly from `ml/Dockerfile`
- The service expects committed `artifacts/serving` files to be present in the deployed revision
