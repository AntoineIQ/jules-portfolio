# Backlog — open modelling questions and ideas

Captured during planning conversations. Not yet implemented. Reviewed before each phase.

## Scheduling / freshness

- [ ] **Session-end triggers, not calendar cron.** F1 race weekends move: different time zones, sprint weekends (Sat race), occasional Saturday qualifying skipped (e.g., Jeddah 2021 history). A Monday-06:00-UTC cron misses data until the next week and wastes runs when nothing changed. Better: poll a schedule feed (FastF1 / Ergast both expose the season schedule) and trigger fetches within ~1h of each session's scheduled end. Implementation: single cron that runs hourly, checks "did a session end in the last hour?", only proceeds if yes.
- [ ] **Pre-season** (Jan–Feb): daily light poll for pre-season testing data once available.

## Contextual / non-timing data

- [ ] **Driver changes**: if a driver is replaced (injury, contract, reserve driver), the per-driver historical features become misleading for the substitute. Need a `driver_is_substitute` flag and a fallback to team-level features.
- [ ] **News signal**: grid penalties announced Thursday, technical infractions, medical withdrawals, equipment failures in free practice. These are reported in F1 news feeds before they appear in timing data. Candidate sources: Formula1.com press releases (RSS), the-race.com, motorsport.com. Risk: noise, sentiment analysis is fragile. Start with structured data only (penalties via FastF1); add news NLP only if it measurably improves calibration.
- [ ] **Winter break news**: driver moves, team name changes, engine supplier switches, major personnel hires. Manually curated `team_changes.csv` per season could work — it's low-volume, ~20 rows a year.
- [ ] **Pre-season testing**: Barcelona/Bahrain testing times are leading indicators. FastF1 does expose some, not all.

## Model architecture

- [ ] **Separate driver skill from car performance** (important). Instead of one model that mixes both, split into:
  - `driver_skill` — learned from per-driver features that normalise out the car (e.g., delta-vs-teammate, qualifying gap to teammate).
  - `car_performance` — team-level feature, changes with upgrades, regulations, reliability.
  - Final prediction combines them. This is closer to chess Elo (player-level) + engine-strength (platform-level).
- [ ] Why it matters: a great car with an inconsistent driver (Perez 2024 vibe) vs. a mediocre car with a great driver (Alonso at Aston Martin) should produce different predictions than a naive model would give.
- [ ] Techniques: hierarchical / mixed-effects models, or feature engineering with teammate-normalised metrics; SHAP then shows the split clearly.

## Active monitoring

- [ ] Beyond scheduled jobs: a lightweight watcher that polls key sources (official F1 news RSS, FIA press releases) every few hours. When it detects an event (penalty, withdrawal, engine change), it regenerates the current-race prediction out of schedule.
- [ ] Store an "event log" per race with timestamps of news items that modified predictions — then the dashboard can show the full prediction trajectory with annotations.
- [ ] In practice this layers on top of Phase 7 (automation). Needs filters to avoid false positives (rumours, clickbait).

## Frontend & portfolio (later phases)

- [ ] **3D mesh-grid viz** (Phase 8): visualise (driver × grid × feature) space as a rotating 3D surface, or SHAP attributions as a deformable mesh. Explore Three.js (via `threejs` or `react-three-fiber`) or `plotly` for prototyping.
- [ ] **Portfolio site** (Phase 9): `projects/portfolio/` as its own project in this monorepo. Next.js on Vercel, one route per ML project, dashboards embedded or re-implemented natively. Optional Supabase/Turso for contact form + analytics. Build only AFTER f1-prediction ships end-to-end.
- [ ] Consider replacing Streamlit with a richer React-based dashboard once the model outputs are stable. Design conversation to start at end of Phase 6.

## Other deferred ideas

- [ ] Weather forecasts from a weather API (open-meteo is free) as an actual predictive feature, not just historical.
- [ ] Driver Elo-like rating system across seasons.
- [ ] Betting odds as a benchmark (the market has its own implicit model to compare against).
- [ ] Calibration per driver/team — is the model better-calibrated for front-runners than midfield?
- [ ] Counterfactual predictions: "what if Verstappen started P10?" via SHAP intervention.
