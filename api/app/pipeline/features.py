"""Port of the DSCO `clean_rank` preprocessing (dsco/src/train_only.py: normalize, features, FoldFeatures).

Behavior must stay identical to the submitted model; any change needs the parity check.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

WEEKS = [f"week{i}_interactions" for i in range(1, 5)]
ACT = ["interaction_volume", "active_days", "unique_sites", "unique_activity_types",
       "avg_daily_interactions", "max_daily_interactions", "interaction_variability",
       "first_activity_day", "last_activity_day", *WEEKS, "interaction_trend",
       "early_interactions", "late_interactions", "late_to_early_interactions_ratio",
       "avg_interactions_per_active_day", "active_weeks",
       "avg_interactions_per_active_week", "activity_span_days"]
SCORES = ["avg_score", "median_score", "max_score", "min_score", "score_std", "score_trend"]
RANKS = ["interaction_volume", "active_days", "unique_sites", "last_activity_day",
         "week4_interactions", "avg_score", "registration_days_from_start"]


def normalize(df: pd.DataFrame) -> pd.DataFrame:
    d = df.drop(columns=["id", "at_risk"], errors="ignore").copy()
    for c in d.select_dtypes(exclude="number"):
        d[c] = d[c].fillna("<missing>").astype(str).str.strip().str.lower()
    d["region"] = d.region.str.replace(" ", "", regex=False)
    # Structural label repairs from DSCO EDA 02: GGG is M07, one M05/P12/261-day row is M07.
    d["code_module"] = d.code_module.replace("ggg", "m07")
    odd = d.code_module.eq("m05") & d.code_presentation.eq("p12") & d.module_presentation_length.eq(261)
    d.loc[odd, "code_module"] = "m07"
    return d


def placeholder_activity(df: pd.DataFrame) -> pd.Series:
    """Rows whose activity block is the imputed placeholder: volume differs from the weekly sum."""
    return ~pd.Series(np.isclose(df.interaction_volume, df[WEEKS].sum(axis=1)), index=df.index)


def features(df: pd.DataFrame) -> pd.DataFrame:
    d = normalize(df)
    d["cohort"] = d.code_module + "_" + d.code_presentation
    missing = placeholder_activity(d)
    d["no_activity"] = missing.astype(int)
    d.loc[missing, ACT] = np.nan
    d.loc[d.has_score.eq(0), SCORES] = np.nan
    # Submission delays and counts stay: a submission can exist without a graded score.
    for a in [1, 2]:
        cols = [f"score_Assessment_{a}", f"weighted_score_Assessment_{a}",
                f"submission_delay_Assessment_{a}"]
        d.loc[d[f"assessment_completion_rate_Assessment_{a}"].eq(0), cols] = np.nan
    d["days_since_last_activity"] = 28 - d.last_activity_day
    d["active_day_ratio"] = d.active_days / (29 - d.first_activity_day)
    d["week4_share"] = d.week4_interactions / d.interaction_volume
    d["sites_per_day"] = d.unique_sites / d.active_days
    d["inter_per_credit"] = d.interaction_volume / d.studied_credits
    d["missed_due"] = d.assessments_due_total * (1 - d.assessment_completion_rate)
    return d.replace([np.inf, -np.inf], np.nan)


class FitState:
    """Category list and per-cohort rank references learned from the training rows."""

    def __init__(self, cats: list[str], ranks: dict[str, dict[str, np.ndarray]], columns: list[str]):
        self.cats, self.ranks, self.columns = cats, ranks, columns

    @classmethod
    def fit(cls, train: pd.DataFrame) -> "FitState":
        d = features(train)
        cats = list(d.select_dtypes(exclude="number").columns)
        ranks = {}
        for c in RANKS:
            ranks[c] = {k: np.sort(g[c].dropna().to_numpy()) for k, g in d.groupby("cohort")}
            ranks[c]["<global>"] = np.sort(d[c].dropna().to_numpy())
        state = cls(cats, ranks, [])
        state.columns = list(state.transform(train.head(1)).columns)
        return state

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        d = features(df)
        for c, refs in self.ranks.items():
            result = np.full(len(d), np.nan)
            for cohort, positions in d.groupby("cohort").indices.items():
                ref = refs.get(cohort, refs["<global>"])
                values = d[c].iloc[positions].to_numpy()
                if len(ref):
                    result[positions] = (np.searchsorted(ref, values, "left") +
                                         np.searchsorted(ref, values, "right")) / (2 * len(ref))
                result[np.asarray(positions)[pd.isna(values)]] = np.nan
            d[c + "_cohort_pct"] = result
        for c in self.cats:
            d[c] = d[c].astype(str)
        return d[self.columns] if self.columns else d

    def save(self, path: Path) -> None:
        path.write_text(json.dumps({
            "cats": self.cats, "columns": self.columns,
            "ranks": {c: {k: v.tolist() for k, v in refs.items()} for c, refs in self.ranks.items()},
        }))

    @classmethod
    def load(cls, path: Path) -> "FitState":
        s = json.loads(path.read_text())
        ranks = {c: {k: np.asarray(v, dtype=float) for k, v in refs.items()} for c, refs in s["ranks"].items()}
        return cls(s["cats"], ranks, s["columns"])
