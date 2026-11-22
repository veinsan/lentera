"""Actionable levers, what-if, and counterfactual search over raw rows in the DSCO test.csv schema.

Each lever edits raw columns and recomputes every aggregate the dataset derives from them, using formulas verified
on train.csv (volume = weekly sum, early/late sums, late/early ratio with 0 when early is 0, active weeks,
per-day and per-week averages, span, and interaction_trend = least-squares slope over weeks 1 to 4).
Results are model scenarios, not causal effects.
"""
from __future__ import annotations

import itertools
import json
from pathlib import Path

import numpy as np
import pandas as pd

from app.model import ARTIFACTS, Model
from app.pipeline.features import WEEKS, normalize, placeholder_activity
from app.rules import THRESHOLD

LEVERS = ["submit", "return_to_activity", "week4_median", "more_active_days"]
LEVER_LABELS = {
    "submit": "Kumpulkan semua asesmen yang jatuh tempo",
    "return_to_activity": "Aktif kembali sampai hari cutoff",
    "week4_median": "Interaksi minggu 4 setara median mahasiswa aman di kohortnya",
    "more_active_days": "Tambah 3 hari aktif",
}
MAX_LEVERS = 3
_SLOPE = np.arange(4) - 1.5  # centered week index for the least-squares slope


def load_targets(artifacts: Path = ARTIFACTS) -> dict:
    return json.loads((artifacts / "scenario_reference.json").read_text())


def recompute_activity(d: pd.DataFrame) -> pd.DataFrame:
    w = d[WEEKS].to_numpy(float)
    d["interaction_volume"] = w.sum(axis=1)
    d["early_interactions"] = w[:, :2].sum(axis=1)
    d["late_interactions"] = w[:, 2:].sum(axis=1)
    early = d.early_interactions.replace(0, np.nan)
    d["late_to_early_interactions_ratio"] = (d.late_interactions / early).fillna(0.0)
    d["active_weeks"] = (w > 0).sum(axis=1)
    d["avg_interactions_per_active_week"] = (d.interaction_volume / d.active_weeks.replace(0, np.nan)).fillna(0.0)
    d["avg_interactions_per_active_day"] = (d.interaction_volume / d.active_days.replace(0, np.nan)).fillna(0.0)
    d["avg_daily_interactions"] = d.avg_interactions_per_active_day
    d["max_daily_interactions"] = np.maximum(d.max_daily_interactions, np.ceil(d.avg_interactions_per_active_day))
    d["activity_span_days"] = d.last_activity_day - d.first_activity_day
    d["interaction_trend"] = w @ _SLOPE / (_SLOPE @ _SLOPE)
    return d


def apply_levers(raw: pd.DataFrame, levers: list[str] | tuple[str, ...], targets: dict) -> pd.DataFrame:
    """Return a copy of the raw rows with the levers applied in LEVERS order. Rows must have a real activity block."""
    d = raw.astype({c: float for c in raw.select_dtypes("integer").columns})
    on = set(levers)
    assert on <= set(LEVERS), on - set(LEVERS)
    if "submit" in on:
        # Only genuine missed submissions change. In M05 and M07 every training row has completion 0 with
        # no_submission_by_cutoff 0, so completion 0 there carries no information and is left as is.
        rows = d.no_submission_by_cutoff.eq(1)
        newly = rows & d.assessment_completion_rate.eq(0)
        for a in [1, 2]:
            due = rows & (d[f"assessments_due_Assessment_{a}"] > 0)
            pending = due & d[f"assessment_completion_rate_Assessment_{a}"].lt(1)
            d.loc[pending, f"submission_delay_Assessment_{a}"] = 0  # submitted on the deadline
            d.loc[due, f"assessment_completion_rate_Assessment_{a}"] = 1.0
        # submitted_count is a placeholder (1) when nothing was submitted, and can exceed the due count otherwise.
        real = d.submitted_count.where(~newly, 0)
        d.loc[rows, "submitted_count"] = np.maximum(real, d.assessments_due_total)[rows]
        d.loc[rows, "assessment_completion_rate"] = 1.0
        d.loc[rows, "no_submission_by_cutoff"] = 0
        # With no earlier submission the delay aggregates were placeholders; the new submissions are on time.
        d.loc[newly, ["avg_submission_delay", "median_submission_delay", "max_submission_delay",
                      "min_submission_delay"]] = 0
    if "return_to_activity" in on:
        idle = d.last_activity_day < 28
        per_day = np.maximum(1, np.round(d.avg_interactions_per_active_day))
        d.loc[idle, "week4_interactions"] += per_day[idle]
        d.loc[idle, "active_days"] += 1
        d.loc[idle, "last_activity_day"] = 28
    if "week4_median" in on:
        cohort = normalize(d).pipe(lambda n: n.code_module + "_" + n.code_presentation)
        target = cohort.map(targets["week4_median_not_at_risk"]).fillna(targets["global_week4_median_not_at_risk"])
        low = d.week4_interactions < target
        was_zero = low & d.week4_interactions.eq(0)
        d.loc[low, "week4_interactions"] = target[low]
        d.loc[was_zero, "active_days"] += 1
        d.loc[was_zero, "last_activity_day"] = np.maximum(d.loc[was_zero, "last_activity_day"], 21)
    if "more_active_days" in on:
        d["active_days"] = d.active_days + 3
    # Active days never exceed the days between first and last activity.
    d["active_days"] = np.minimum(d.active_days, d.last_activity_day - d.first_activity_day + 1)
    return recompute_activity(d)


def simulate(model: Model, raw: pd.DataFrame, levers: list[str], targets: dict) -> np.ndarray:
    """What-if probabilities for the given levers; NaN for rows without a real activity block."""
    out = np.full(len(raw), np.nan)
    ok = ~placeholder_activity(raw).to_numpy()
    if ok.any():
        out[ok] = model.predict_proba(apply_levers(raw[ok], levers, targets))
    return out


def counterfactual(model: Model, raw: pd.DataFrame, targets: dict) -> list[dict]:
    """For each row: probability of every lever combination (up to MAX_LEVERS) and the smallest one below the threshold.

    Ties in size go to the lowest probability. Rows with the placeholder activity block get an administrative check.
    """
    raw = raw.reset_index(drop=True)
    combos = [c for k in range(1, MAX_LEVERS + 1) for c in itertools.combinations(LEVERS, k)]
    base = model.predict_proba(raw)
    ok = ~placeholder_activity(raw).to_numpy()
    probs = np.full((len(raw), len(combos)), np.nan)
    if ok.any():
        sub = raw[ok]
        variants = pd.concat([apply_levers(sub, c, targets) for c in combos], ignore_index=True)
        probs[ok] = model.predict_proba(variants).reshape(len(combos), -1).T
    results = []
    for i in range(len(raw)):
        if not ok[i]:
            results.append(dict(applicable=False, base=float(base[i]), reason="placeholder_activity", best=None,
                                closest=None, single=[]))
            continue
        # Only levers that lower this student's probability on their own are offered. A lever can leave it unchanged
        # (nothing to change) or raise it, because the model is not monotonic in every feature.
        helpful = {c[0] for j, c in enumerate(combos) if len(c) == 1 and probs[i, j] < base[i]}
        options = [(len(c), probs[i, j], c) for j, c in enumerate(combos) if helpful.issuperset(c)]
        below = [o for o in options if o[1] < THRESHOLD]
        best = min(below, key=lambda t: (t[0], t[1])) if below and base[i] >= THRESHOLD else None
        closest = min(options, key=lambda t: t[1]) if options else None
        results.append(dict(
            applicable=True, base=float(base[i]),
            reason=None if best else ("not_flagged" if base[i] < THRESHOLD else "no_combination_below_threshold"),
            best=_combo(best), closest=_combo(closest),
            single=[dict(lever=c[0], label=LEVER_LABELS[c[0]], probability=float(probs[i, j]))
                    for j, c in enumerate(combos) if len(c) == 1 and c[0] in helpful]))
    return results


def _combo(option: tuple | None) -> dict | None:
    if option is None:
        return None
    return dict(levers=list(option[2]), labels=[LEVER_LABELS[x] for x in option[2]], probability=float(option[1]))
