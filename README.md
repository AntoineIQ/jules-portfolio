# Jules Portfolio + F1 Lab

Monorepo for the public portfolio site and the live F1 model API.

## Layout

- `apps/web` — Next.js portfolio and F1 case-study frontend
- `ml` — training, export, and FastAPI serving code
- `.github/workflows` — CI, weekly schedule regeneration, and post-session refresh

## Architecture

- Vercel deploys `apps/web`
- Railway deploys `ml`
- `apps/web` proxies `/api/f1/*` to the Railway service using `F1_API_ORIGIN`
- GitHub Actions ingests new session data, republishes static web payloads plus serving artifacts, verifies both surfaces, and pushes only when outputs changed

## Local setup

### Web

```bash
cd apps/web
npm install
npm run dev
```

### ML

```bash
cd ml
uv sync --extra train --extra dev
uv run python -m f1_prediction.publish
uv run uvicorn app.main:app --reload
```

## Verification

### Web

```bash
cd apps/web
npm run typecheck
npm run build
npm run test:e2e
```

### ML

```bash
cd ml
uv run pytest -q
```

## Deploy

### Vercel

- Import the repo
- Set the root directory to `apps/web`
- Set `F1_API_ORIGIN` to your Railway API URL

### Railway

- Create a service rooted at `ml`
- Deploy from `ml/Dockerfile`
- Expose port `8080`

## Automation

- `.github/workflows/ci.yml` runs web build/typecheck, Playwright smoke tests, and the ML test suite
- `.github/workflows/scheduler.yml` rebuilds the next 7 days of post-session triggers every Monday
- `.github/workflows/refresh-sessions.yml` ingests the current F1 season, republishes the site data and serving artifacts, verifies both layers, and commits changes when the pipeline produced new outputs
