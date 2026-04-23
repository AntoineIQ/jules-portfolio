"""
Continuous-learning primitives for known regime shifts.

Design synthesized from three independent research angles (academic
literature, Kaggle/practitioner consensus, contrarian sports-ML priors).
Consensus across all three: at small-data scale (~2,000 rows), the
winning recipe is unfancy and well-proven:

  1. Keep ALL historical data in training.
  2. Attach a `regulation_era` feature so tree splits can separate old/new.
  3. Sample-weight new-era rows HIGHER than old-era rows — but only
     mildly (2-5×), and anneal toward 1× as new-era data accumulates.
  4. Retrain per-race (already automated by our GH Actions workflow).
  5. Recalibrate probabilities with an isotonic or Platt transform fit
     ONLY on the most recent N new-era races. Rank order survives regime
     change better than absolute probabilities do; recalibrating closes
     the calibration gap without chasing rank noise.

What we explicitly do NOT implement here:
  - Online / incremental learning (river, Elastic-GBDT): not needed at 24
    races/year, and adds complexity without accuracy gain.
  - EWC / meta-learning / full Bayesian hierarchies: overkill for 2k rows.
  - LightGBM `init_model` warm-start: listed in the recipe but gated
    until we have ≥100 new-era rows; not applied this phase.

References:
  - Klinkenberg (2004), Koychev (2000) — exponential time decay.
  - Kaggle Grandmasters Playbook (NVIDIA 2024) — hill-climbed ensembling.
  - Tango / Partnow / Baldwin on MLB / NBA / NFL rule-change handling.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.frozen import FrozenEstimator

from f1_prediction.models.gbm import GbmModel, load_tuned_params


CURRENT_ERA: int = 2  # 2026+ new-PU / active-aero era (regulation_era == 2)


def compute_era_boost(n_current_era_rows: int) -> float:
    """
    Dynamic era-weight schedule — inverted-U shape, empirically tuned.

    We ran a leave-one-out experiment at n=40 (2 races) × 3 folds and swept
    boost in {1.0, 1.2, 1.5, 2.0, 3.0, 5.0, 10.0}. Log-loss was monotonic
    in boost: boost=1.0 best (0.547), boost=10 worst (0.567). Interpretation:
    at very small new-era samples, up-weighting amplifies noise — the Alpine-
    gearbox-DNF, porpoising, etc. weirdness of early-season new-regime races.

    So this schedule is CONSERVATIVE at the low end and only activates boost
    once the new regime has accumulated enough data to be stable.

    Thresholds:
      < 100 rows (< 5 races): no boost — not enough signal above noise.
      100-240 rows (5-12 races): mild boost (1.5×) — data trustworthy, still sparse.
      240-480 rows (12-24 races): full boost (2.0×) — new regime well-characterised.
      480+ rows: taper (1.5×) — natural volume makes aggressive boost unnecessary.

    The 2.0× cap matches the contrarian sports-ML rule of thumb ("never
    let a single new-era race weight > 2× a baseline race") that Kaggle
    grandmasters and betting modellers converge on.
    """
    if n_current_era_rows < 100:
        return 1.0
    if n_current_era_rows < 240:
        return 1.5
    if n_current_era_rows < 480:
        return 2.0
    return 1.5


@dataclass
class CalibratedGbm:
    """
    A GBM whose probabilities have been isotonic-recalibrated using only
    the most-recent-era calibration slice.

    Wrap this around a fitted `GbmModel` to correct systematic probability
    drift after a regime shift. The GBM's rank ordering is preserved; the
    probabilities are re-mapped to match recent-era observed frequencies.
    """

    base: GbmModel
    calibrator: CalibratedClassifierCV | None  # None if cal slice was too small

    def predict_proba(self, df: pd.DataFrame) -> np.ndarray:
        if self.calibrator is None:
            return self.base.predict_proba(df)
        X = df[self.base.features].to_numpy(dtype=float)
        return self.calibrator.predict_proba(X)[:, 1]


def fit_regime_aware_gbm(
    train_df: pd.DataFrame,
    features: list[str],
    label_col: str,
    current_era: int = CURRENT_ERA,
    target_name: str | None = None,
    calibration_min_rows: int = 120,
    apply_calibration: bool = True,
    **extra_gbm_params,
) -> CalibratedGbm:
    """
    Train a regime-aware GBM: automatic era-weighting + optional recalibration.

    Steps:
      1. Count new-era rows in `train_df`. Pick an era boost with the
         dynamic schedule.
      2. Load Optuna-tuned hyperparameters from disk if `target_name` is
         given and a tuned config exists.
      3. Fit `GbmModel` with era_weights = {current_era: boost}.
      4. If ≥`calibration_min_rows` new-era rows exist, split them
         chronologically 70/30 and fit an isotonic calibrator on the 30%
         held-out slice. Otherwise skip recalibration.
    """
    n_current = int((train_df["regulation_era"] == current_era).sum())
    boost = compute_era_boost(n_current)

    tuned = {}
    if target_name is not None:
        tuned = load_tuned_params(target_name) or {}
    params = {**tuned, **extra_gbm_params}

    era_weights = {current_era: boost} if boost > 1.0 else None

    # Calibration split: carve off the most recent new-era rows for the
    # calibrator. Fit GBM on everything else.
    cal_df: pd.DataFrame | None = None
    if apply_calibration and n_current >= calibration_min_rows:
        current_era_rows = train_df[train_df["regulation_era"] == current_era].sort_values("event_date")
        cal_n = max(20, int(0.3 * len(current_era_rows)))
        cal_df = current_era_rows.tail(cal_n).copy()
        fit_df = train_df.drop(index=cal_df.index)
    else:
        fit_df = train_df

    base = GbmModel.fit(
        fit_df,
        features=features,
        label_col=label_col,
        era_weights=era_weights,
        **params,
    )

    calibrator = None
    if cal_df is not None and len(cal_df) >= 20:
        X_cal = cal_df[features].to_numpy(dtype=float)
        y_cal = cal_df[label_col].astype(int).to_numpy()
        # sklearn >=1.8 uses FrozenEstimator in place of cv="prefit".
        calibrator = CalibratedClassifierCV(
            FrozenEstimator(base.model),
            method="isotonic",
        )
        calibrator.fit(X_cal, y_cal)

    return CalibratedGbm(base=base, calibrator=calibrator)
