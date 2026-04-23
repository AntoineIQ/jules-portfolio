"""
F1 prediction dashboard — Phase 8.

Features:
- Pick any season 2022-2025 (not just the held-out test season).
- Training-set races are clearly flagged so inflated scores are not mistaken
  for real test performance.
- "No model" view shows only actual results without running any prediction.
- Four prediction targets: race points, qualifying top-10, sprint points,
  sprint qualifying top-5.
- Model options vary per target. SHAP waterfall for GBM predictions.

Run with:
    uv run streamlit run app/streamlit_app.py
"""

from __future__ import annotations

import altair as alt
import pandas as pd
import streamlit as st

from f1_prediction.evaluate import evaluate_probabilities
from f1_prediction.explain import ShapExplanation
from f1_prediction.models.baseline import GridPositionBaseline
from f1_prediction.models.gbm import GbmModel, load_tuned_params
from f1_prediction.models.linear import FeaturesLogit
from f1_prediction.targets import TARGETS, build_multi_target_frame, prepare_target_frame

st.set_page_config(
    page_title="F1 prediction lab",
    page_icon="🏎️",
    layout="wide",
)

TRAIN_THROUGH_SEASON = 2024


# ---- Data + models (cached) ---------------------------------------------------


@st.cache_data(show_spinner=False)
def load_frame() -> pd.DataFrame:
    return build_multi_target_frame()


@st.cache_resource(show_spinner=True)
def fit_gbm(target_name: str, train_through_season: int) -> GbmModel:
    frame = load_frame()
    target = TARGETS[target_name]
    usable = prepare_target_frame(target, frame=frame)
    train = usable[usable["season"] <= train_through_season].copy()
    train["_target_"] = train[target.label_col].astype(int)
    # Use Optuna-tuned params if available (data/tuned/<target>.json), else defaults.
    tuned = load_tuned_params(target_name) or {}
    return GbmModel.fit(train, features=target.features, label_col="_target_", **tuned)


RACE_LIKE_TARGETS = {"race_points", "race_podium", "race_winner"}


@st.cache_resource(show_spinner=True)
def fit_baseline(target_name: str, train_through_season: int) -> GridPositionBaseline:
    frame = load_frame()
    target = TARGETS[target_name]
    usable = prepare_target_frame(target, frame=frame)
    train = usable[usable["season"] <= train_through_season].copy()
    train["points_finish"] = train[target.label_col].astype(int)
    return GridPositionBaseline.fit(train)


@st.cache_resource(show_spinner=True)
def fit_features_logit(target_name: str, train_through_season: int) -> FeaturesLogit:
    frame = load_frame()
    target = TARGETS[target_name]
    usable = prepare_target_frame(target, frame=frame)
    train = usable[usable["season"] <= train_through_season].copy()
    train["_t_"] = train[target.label_col].astype(int)
    return FeaturesLogit.fit(train, features=target.features, label_col="_t_")


def predict(
    model_name: str,
    target_name: str,
    df: pd.DataFrame,
    train_through: int,
) -> pd.Series | None:
    if model_name == "no model (truth only)":
        return None
    if model_name == "baseline (grid only)":
        return pd.Series(fit_baseline(target_name, train_through).predict_proba(df), index=df.index)
    if model_name == "features_logit":
        return pd.Series(fit_features_logit(target_name, train_through).predict_proba(df), index=df.index)
    return pd.Series(fit_gbm(target_name, train_through).predict_proba(df), index=df.index)


# ---- UI -----------------------------------------------------------------------


st.title("🏎️ F1 prediction lab")
st.caption(
    "Per-driver probabilities across four F1 prediction targets. "
    "Models trained on 2022–2024, evaluated on 2025+. "
    "See `docs/learning/` for deep dives into every concept."
)

frame = load_frame()


# --- Sidebar ------------------------------------------------------------------

with st.sidebar:
    st.header("Controls")

    # -- Target picker --
    target_name = st.selectbox(
        "What are we predicting?",
        options=list(TARGETS),
        format_func=lambda n: TARGETS[n].display,
        index=0,
    )
    target = TARGETS[target_name]

    available_seasons = sorted(
        frame[(frame["season"] >= 2022) & frame[target.label_col].notna()]["season"].unique().tolist()
    )
    if not available_seasons:
        st.error(f"No data available for target '{target_name}'.")
        st.stop()

    selected_season = st.selectbox(
        "Season",
        options=available_seasons,
        index=len(available_seasons) - 1,
    )
    is_training_season = selected_season <= TRAIN_THROUGH_SEASON
    if is_training_season:
        st.warning(
            f"⚠️ {selected_season} is in the model's **training set**. "
            "Predictions will look artificially good — model has seen the answers."
        )
    else:
        st.success(f"✅ {selected_season} is **held-out test data** — model has never seen it.")

    # Only races that have this target's label (e.g., sprints only for sprint targets)
    races = (
        frame[(frame["season"] == selected_season) & frame[target.label_col].notna()][
            ["round", "event_name", "event_date"]
        ]
        .drop_duplicates()
        .sort_values("round")
    )
    if races.empty:
        st.error("No races with this target in the selected season.")
        st.stop()

    race_labels = {
        row["round"]: f"R{row['round']:02d} · {row['event_name']}"
        for _, row in races.iterrows()
    }
    rounds = list(races["round"])
    selected_round = st.selectbox(
        "Race",
        options=rounds,
        format_func=lambda r: race_labels[r],
        index=len(rounds) - 1,
    )

    # baseline + features_logit only apply to race-like targets (need grid_position).
    if target_name in RACE_LIKE_TARGETS:
        model_options = ["gbm", "features_logit", "baseline (grid only)", "no model (truth only)"]
    else:
        model_options = ["gbm", "features_logit", "no model (truth only)"]
    # Best-model-per-target defaults — from measured 2025 test performance
    # (train_all results). For non-race targets, features_logit dominated the
    # tuned GBM; for race targets, tuned GBM edges it out. See Phase 10 doc.
    BEST_DEFAULT = {
        "race_points": "gbm",
        "race_podium": "gbm",
        "race_winner": "gbm",
        "h2h_beats_teammate": "gbm",
        "quali_top10": "features_logit",
        "sprint_points": "features_logit",
        "sprint_grid_top5": "features_logit",
    }
    default_model = BEST_DEFAULT.get(target_name, "gbm")
    default_idx = model_options.index(default_model) if default_model in model_options else 0
    model_name = st.radio("Model", options=model_options, index=default_idx)

    st.markdown(
        f"Model trained on seasons **2022–{TRAIN_THROUGH_SEASON}**. "
        f"Features for this target: `{', '.join(target.features)}`."
    )
    st.markdown(
        "**Learning docs:**\n"
        "- [01 — Probability & surprise](https://github.com/AntoineIQ/ml-projects/blob/main/docs/learning/01-probability-and-surprise.md)\n"
        "- [02 — Feature engineering](https://github.com/AntoineIQ/ml-projects/blob/main/docs/learning/02-feature-engineering.md)\n"
        "- [03 — Where the data comes from](https://github.com/AntoineIQ/ml-projects/blob/main/docs/learning/03-where-the-data-comes-from.md)\n"
        "- [04 — Gradient boosting](https://github.com/AntoineIQ/ml-projects/blob/main/docs/learning/04-gradient-boosting.md)\n"
        "- [05 — Calibration](https://github.com/AntoineIQ/ml-projects/blob/main/docs/learning/05-calibration.md)\n"
        "- [06 — SHAP](https://github.com/AntoineIQ/ml-projects/blob/main/docs/learning/06-shap.md)\n"
        "- [07 — CI/CD & automation](https://github.com/AntoineIQ/ml-projects/blob/main/docs/learning/07-cicd-and-automation.md)"
    )


# --- Race frame + predictions -------------------------------------------------

race_df = frame[
    (frame["season"] == selected_season)
    & (frame["round"] == selected_round)
    & frame[target.label_col].notna()
].copy()

# NOTE: we deliberately keep rows with NaN features — LightGBM handles them
# natively, FeaturesLogit imputes via median in its pipeline, and the baseline
# now has an imputer too. Dropping on target.features here disagreed with
# prepare_target_frame and caused the dashboard to hide drivers the models
# actually do predict on. See Phase 14 audit.
if race_df.empty:
    st.error("No rows found for the selected race / target.")
    st.stop()

predictions = predict(model_name, target_name, race_df, TRAIN_THROUGH_SEASON)

if predictions is not None:
    race_df["p"] = predictions
    race_df = race_df.sort_values("p", ascending=False).reset_index(drop=True)
else:
    race_df["p"] = None
    race_df = race_df.sort_values("grid_position").reset_index(drop=True)

event_name = race_df["event_name"].iloc[0]
st.subheader(f"Round {selected_round:02d} · {event_name}  —  {target.display}")
st.caption(f"Model: **{model_name}**")

if is_training_season and predictions is not None:
    st.info("ℹ️ In-sample metrics — the model has seen this race during training.")


# --- KPIs ---------------------------------------------------------------------

race_df["_label_"] = race_df[target.label_col].astype(int)
y_true = race_df["_label_"].to_numpy()

col_a, col_b, col_c, col_d = st.columns(4)
col_a.metric("drivers", int(len(y_true)))
col_b.metric(f"actually '{target.points_threshold}'-or-better", int(y_true.sum()))

if predictions is not None:
    m = evaluate_probabilities(y_true, race_df["p"].to_numpy(), label="race")
    col_c.metric("log-loss", f"{m['log_loss']:.3f}")
    col_d.metric("Brier", f"{m['brier']:.3f}")
else:
    col_c.metric("log-loss", "—")
    col_d.metric("Brier", "—")


# --- SHAP (GBM + predictions available) --------------------------------------

gbm_shap: ShapExplanation | None = None
if model_name == "gbm" and predictions is not None:
    gbm_for_shap = fit_gbm(target_name, TRAIN_THROUGH_SEASON)
    gbm_shap = ShapExplanation.from_gbm(gbm_for_shap, race_df)


# --- Main row: table + chart --------------------------------------------------

base_cols = ["driver", "team", "grid_position", "finish_position"]
renames = {
    "driver": "Driver",
    "team": "Team",
    "grid_position": "Grid",
    "finish_position": "Finish",
}
table_cols = [c for c in base_cols if c in race_df.columns]

# For sprint targets, show sprint grid instead
if target_name in ("sprint_points", "sprint_grid_top5"):
    table_cols = ["driver", "team", "sprint_grid_position"]
    renames["sprint_grid_position"] = "Sprint grid"

if predictions is not None:
    table_cols = [*table_cols, "p"]
    renames["p"] = "P"

if gbm_shap is not None:
    race_df["why"] = [gbm_shap.format_contributions(idx, k=3) for idx in race_df.index]
    table_cols = [*table_cols, "why"]
    renames["why"] = "Top SHAP drivers"

# Always show actual outcome
table_cols = [*table_cols, "_label_"]
renames["_label_"] = "Outcome"

table = race_df[table_cols].rename(columns=renames)

left, right = st.columns([1.6, 1])
with left:
    st.markdown("### Per-driver")
    fmt: dict[str, str] = {}
    if "Grid" in table.columns:
        fmt["Grid"] = "{:.0f}"
    if "Finish" in table.columns:
        fmt["Finish"] = "{:.0f}"
    if "Sprint grid" in table.columns:
        fmt["Sprint grid"] = "{:.0f}"
    if "P" in table.columns:
        fmt["P"] = "{:.2f}"
        styler = table.style.format(fmt).background_gradient(subset=["P"], cmap="Greens")
    else:
        styler = table.style.format(fmt)
    st.dataframe(styler, hide_index=True, width="stretch")

with right:
    if predictions is not None:
        st.markdown("### Predicted probability")
        chart_df = race_df.assign(outcome=race_df["_label_"].map({1: "scored", 0: "did not score"}))
        chart = (
            alt.Chart(chart_df)
            .mark_bar()
            .encode(
                x=alt.X("p:Q", title="P", scale=alt.Scale(domain=[0, 1])),
                y=alt.Y("driver:N", sort="-x", title=None),
                color=alt.Color(
                    "outcome:N",
                    scale=alt.Scale(domain=["scored", "did not score"], range=["#2ca02c", "#d62728"]),
                    title="actual outcome",
                ),
                tooltip=["driver", "team", "p"],
            )
            .properties(height=520)
        )
    else:
        # Target-aware truth-only chart. Using the right x/y per target so
        # quali / sprint / H2H views don't render against irrelevant axes.
        if target_name in ("race_points", "race_podium", "race_winner"):
            chart_x, chart_y = "grid_position", "finish_position"
        elif target_name == "quali_top10":
            # driver_quali_gap_last_3 as pre-race signal; actual quali outcome on y
            chart_x, chart_y = "driver_quali_gap_last_3", "finish_position"
        elif target_name in ("sprint_points", "sprint_grid_top5"):
            chart_x, chart_y = "sprint_grid_position", "finish_position"
        elif target_name == "h2h_beats_teammate":
            chart_x, chart_y = "grid_vs_teammate", "finish_position"
        else:
            chart_x, chart_y = "grid_position", "finish_position"

        # Fall back to grid_position if the chosen x is entirely missing for this race.
        if chart_x not in race_df.columns or race_df[chart_x].isna().all():
            chart_x = "grid_position"

        st.markdown(f"### {chart_x.replace('_', ' ').title()} vs. {chart_y.replace('_', ' ').title()}")
        chart = (
            alt.Chart(race_df)
            .mark_point(size=80, filled=True)
            .encode(
                x=alt.X(f"{chart_x}:Q", title=chart_x.replace("_", " ").title()),
                y=alt.Y(
                    f"{chart_y}:Q",
                    title=chart_y.replace("_", " ").title(),
                    sort="descending",
                ),
                color=alt.Color(
                    "_label_:N",
                    scale=alt.Scale(domain=[1, 0], range=["#2ca02c", "#d62728"]),
                    legend=alt.Legend(title="outcome"),
                ),
                tooltip=["driver", "team"],
            )
            .properties(height=520)
        )
    st.altair_chart(chart, use_container_width=True)


# --- SHAP waterfall ----------------------------------------------------------

if gbm_shap is not None:
    st.divider()
    st.markdown("### Why this driver? (SHAP waterfall)")
    selected_driver = st.selectbox("Driver", options=list(race_df["driver"]), index=0)
    driver_idx = race_df[race_df["driver"] == selected_driver].index[0]
    contributions = gbm_shap.top_k(driver_idx, k=len(gbm_shap.values.columns))

    contrib_df = pd.DataFrame(contributions, columns=["feature", "contribution"])
    contrib_df["direction"] = contrib_df["contribution"].map(
        lambda v: "pushes P up" if v > 0 else "pushes P down"
    )
    waterfall = (
        alt.Chart(contrib_df)
        .mark_bar()
        .encode(
            x=alt.X("contribution:Q", title="log-odds contribution (+ up, − down)"),
            y=alt.Y(
                "feature:N",
                sort=alt.EncodingSortField(field="contribution", op="sum", order="descending"),
                title=None,
            ),
            color=alt.Color(
                "direction:N",
                scale=alt.Scale(domain=["pushes P up", "pushes P down"], range=["#2ca02c", "#d62728"]),
                title=None,
            ),
            tooltip=["feature", "contribution"],
        )
        .properties(height=320)
    )
    st.altair_chart(waterfall, use_container_width=True)

    with st.expander("What am I looking at?"):
        st.markdown(
            f"""
The model starts from a **base log-odds** of `{gbm_shap.base_value:+.2f}`.
For this specific driver, each feature adds or subtracts to that base,
and the final sum is passed through a sigmoid to get the predicted probability.
**Green** = pushes probability up, **red** = pushes down. Magnitude is log-odds.
See `docs/learning/06-shap.md` for the full intuition.
"""
        )
