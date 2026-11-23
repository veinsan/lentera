"""Features of the DSCO final model (dsco/notebooks/dsco_lgbm_dae_pair_final.ipynb, cells 42 to 56).

The notebook ranks students within their module-presentation over train and test together. The API keeps those
semantics with a Context: per module-presentation reference values of the training rows plus the scored cohort.
Scoring the DSCO test cohort this way reproduces the notebook. A what-if row is ranked in the same context with the
student's original row taken out, so an unchanged row gets its stored probability back.

Any change here needs the parity check (scripts/parity_check.py).
"""
from __future__ import annotations

import numpy as np
import pandas as pd

WEEKS = [f"week{i}_interactions" for i in range(1, 5)]


# Raw-row helpers for the decision rules, the stored module code, and the quality gate. They do not feed the model.
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


# The notebook's feature code. Column order matters: LightGBM samples columns by position.
CAT_COLS = ["code_module", "code_presentation", "gender", "region", "highest_education", "imd_band", "age_band",
            "disability", "mp", "segmen"]
WK = WEEKS
EDU_ORD = {"no formal quals": 0, "lower than a level": 1, "a level": 2, "he qualification": 3,
           "post graduate qualification": 4}
AGE_ORD = {"0-35": 0, "35-55": 1, "55<=": 2}
VLE_COLS = ["interaction_volume", "active_days", "unique_sites", "unique_activity_types", "avg_daily_interactions",
            "max_daily_interactions", "interaction_variability", "first_activity_day", "last_activity_day"] + WK + [
            "interaction_trend", "early_interactions", "late_interactions", "late_to_early_interactions_ratio",
            "avg_interactions_per_active_day", "active_weeks", "avg_interactions_per_active_week", "activity_span_days"]
SCORE_COLS = ["avg_score", "median_score", "max_score", "min_score", "score_std", "avg_submission_delay",
              "median_submission_delay", "max_submission_delay", "min_submission_delay", "weighted_score_total",
              "score_trend", "submitted_count", "late_submission_count"]
A1_COLS = ["score_Assessment_1", "weighted_score_Assessment_1", "submission_delay_Assessment_1"]
A2_COLS = ["score_Assessment_2", "weighted_score_Assessment_2", "submission_delay_Assessment_2"]
ASSESS_FLAGS = ["has_score", "no_submission_by_cutoff", "assessments_due_total", "assessments_due_Assessment_1",
                "assessments_due_Assessment_2", "assessment_completion_rate", "assessment_completion_rate_Assessment_1",
                "assessment_completion_rate_Assessment_2"]
RANK_OTHERS = ["active_days", "interaction_volume", "unique_sites", "unique_activity_types", "min_week", "recency",
               "clicks_per_site", "max_daily_interactions", "first_score", "first_delay",
               "registration_days_from_start", "studied_credits", "weighted_score_total"]
RANKED = WK + RANK_OTHERS  # columns ranked within module-presentation by add_features


def fix_categories(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["code_module"] = df["code_module"].replace({"GGG": "M07"})
    no_assess = (df["has_score"] == 0) & (df["no_submission_by_cutoff"] == 0)
    df.loc[(df["code_module"] == "M04") & no_assess, "code_module"] = "M07"
    df.loc[(df["code_module"] == "M05") & (df["module_presentation_length"] == 261), "code_module"] = "M07"
    df["highest_education"] = df["highest_education"].str.lower().replace({"-": "no formal quals"})
    df["imd_band"] = df["imd_band"].replace({"-": "10-20%"})
    df["region"] = df["region"].str.lower().str.replace(" ", "", regex=False)
    df["mp"] = df["code_module"] + "_" + df["code_presentation"]
    return df


def undo_imputation(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["vle_missing"] = (df[WK].sum(axis=1) != df["interaction_volume"]).astype(int)
    df.loc[df["vle_missing"] == 1, VLE_COLS] = np.nan
    df["assess_window"] = (~df["code_module"].isin(["M05", "M07"])).astype(int)
    df.loc[df["assess_window"] == 0, ASSESS_FLAGS] = np.nan
    df.loc[df["has_score"] != 1, SCORE_COLS + A1_COLS + A2_COLS] = np.nan
    df.loc[df["assessments_due_Assessment_1"] != 1, A1_COLS] = np.nan
    df.loc[df["assessments_due_Assessment_2"] != 1, A2_COLS] = np.nan
    return df.drop(columns=["submitted_Assessment_1", "submitted_Assessment_2", "median_score",
                            "median_submission_delay", "avg_interactions_per_active_day"])


def add_features(df: pd.DataFrame, stats) -> pd.DataFrame:
    """The notebook's add_features; `stats` supplies the module-presentation statistics (ranks, median, credit mode)."""
    df = df.copy()
    df["segmen"] = np.select([df["vle_missing"] == 1, df["assess_window"] == 0, df["has_score"] == 1,
                              df["no_submission_by_cutoff"] == 1],
                             ["A_no_vle", "B_no_assess", "C_submit", "D_no_submit"], "E_other")
    df["edu_ord"] = df["highest_education"].map(EDU_ORD)
    df["imd_ord"] = pd.to_numeric(df["imd_band"].str.extract(r"^(\d+)")[0], errors="coerce")
    df["imd_missing"] = (df["imd_band"] == "?").astype(int)
    df["age_ord"] = df["age_band"].map(AGE_ORD)
    df["is_B"] = df["code_presentation"].isin(["P11", "P21"]).astype(int)
    df["year2014"] = df["code_presentation"].isin(["P21", "P22"]).astype(int)
    df["extra_credits"] = df["studied_credits"] - stats.credit_mode(df)

    a2_due = df["assessments_due_Assessment_2"] == 1
    df["first_score"] = np.where(a2_due, df["score_Assessment_2"], df["score_Assessment_1"])
    df["first_delay"] = np.where(a2_due, df["submission_delay_Assessment_2"], df["submission_delay_Assessment_1"])
    df["score_is_practice"] = (df["mp"] == "M02_P22").astype(int)
    df.loc[df["score_is_practice"] == 1, "first_score"] = np.nan
    df["score_lt40"] = np.where(df["first_score"].notna(), (df["first_score"] < 40).astype(float), np.nan)

    w = df[WK]
    df["min_week"] = w.min(axis=1)
    df["zero_weeks"] = (w == 0).sum(axis=1).where(df["vle_missing"] == 0)
    df["week_pattern"] = ((w > 0).astype(int) * [8, 4, 2, 1]).sum(axis=1).where(df["vle_missing"] == 0)
    df["recency"] = 28 - df["last_activity_day"]
    df["stop_w4"] = ((df["week4_interactions"] == 0) & (df["interaction_volume"] > 0)).astype(float).where(
        df["vle_missing"] == 0)
    df["clicks_per_site"] = df["interaction_volume"] / df["unique_sites"]
    df["log_volume"] = np.log1p(df["interaction_volume"])

    for c in WK:
        df["rk_" + c[:5]] = stats.rank(c, df)
    rk = df[["rk_week1", "rk_week2", "rk_week3", "rk_week4"]]
    df["rk_mean"] = rk.mean(axis=1)
    df["rk_min"] = rk.min(axis=1)
    df["rk_std"] = rk.std(axis=1)
    for c in RANK_OTHERS:
        df["rk_" + c] = stats.rank(c, df)
    df["vol_over_mp_median"] = df["interaction_volume"] / stats.median("interaction_volume", df)

    df["score_x_delay"] = df["rk_first_score"] * (1 - df["rk_first_delay"])
    df["score_x_engage"] = df["rk_first_score"] * df["rk_mean"]
    df["credits_x_prev"] = df["extra_credits"] * (1 + df["num_of_prev_attempts"])
    df["recency_x_nosub"] = df["recency"] * df["no_submission_by_cutoff"]
    return df


class FrameStats:
    """Statistics over the frame itself, as the notebook computes them on train and test together. Used for training."""

    def credit_mode(self, df: pd.DataFrame) -> pd.Series:
        mode = df.groupby("code_module")["studied_credits"].agg(lambda s: s.mode().iloc[0])
        return df["code_module"].map(mode)

    def rank(self, column: str, df: pd.DataFrame) -> pd.Series:
        return df.groupby("mp")[column].rank(pct=True)

    def median(self, column: str, df: pd.DataFrame) -> pd.Series:
        return df.groupby("mp")[column].transform("median")


def rank_in_pool(pool: np.ndarray, values: np.ndarray, own: np.ndarray) -> np.ndarray:
    """Percentile rank (pandas `rank(pct=True)`, average ties) of each value in the pool with `own` taken out.

    `pool` is sorted and holds every non-missing value of the population, including each row's own original value
    `own` when that row belongs to it (NaN otherwise). An unchanged row gets exactly its in-population rank.
    """
    values = np.asarray(values, dtype=float)
    own = np.asarray(own, dtype=float)
    less = np.searchsorted(pool, values, "left").astype(float)
    ties = np.searchsorted(pool, values, "right") - less
    present = ~np.isnan(own)
    less -= present & (own < values)
    ties -= present & (own == values)
    n = len(pool) - present
    out = (less + (ties + 2) / 2) / (n + 1)
    out[np.isnan(values)] = np.nan
    return out


class Context:
    """The population a cohort is ranked in: the training rows' reference values plus the cohort itself."""

    def __init__(self, ref: dict, cohort: pd.DataFrame):
        self.ref, self.source = ref, cohort
        self.pools: dict[str, dict[str, np.ndarray]] = {}
        self.medians: dict[str, dict[str, float]] = {}
        d = undo_imputation(fix_categories(cohort))
        counts = {m: dict(v) for m, v in ref["credits"].items()}
        for m, v in d.groupby("code_module")["studied_credits"].value_counts().items():
            counts.setdefault(m[0], {})
            counts[m[0]][float(m[1])] = counts[m[0]].get(float(m[1]), 0) + int(v)
        # pandas Series.mode(): the most frequent value, the smallest one on a tie.
        self.modes = {m: min(c, key=lambda k: (-c[k], k)) for m, c in counts.items() if c}
        self.own: pd.DataFrame | None = None
        base = add_features(d, self)
        mpq = self.mpq(base)
        self.own = pd.concat([base, mpq], axis=1).set_index("id", drop=False)

    # Statistics interface used by add_features.
    def credit_mode(self, df: pd.DataFrame) -> pd.Series:
        return df["code_module"].map(self.modes)

    def _own(self, column: str, df: pd.DataFrame) -> np.ndarray:
        """Each row's original value of `column` in this cohort; NaN for a row that is not part of the cohort."""
        if self.own is None:  # building: the frame is the cohort itself
            return df[column].to_numpy(float)
        return self.own[column].reindex(df["id"].astype("int64")).to_numpy(float)

    def _rank(self, kind: str, column: str, df: pd.DataFrame) -> pd.Series:
        building = self.own is None
        pools = self.pools.setdefault(f"{kind}|{column}", {})
        values, own = df[column].to_numpy(float), self._own(column, df)
        out = np.full(len(df), np.nan)
        for mp, pos in df.groupby("mp").indices.items():
            if building:
                cohort_values = values[pos][~np.isnan(values[pos])]
                pools[mp] = np.sort(np.concatenate([self.ref[kind][column].get(mp, np.empty(0)), cohort_values]))
            pool = pools.get(mp)
            if pool is None:
                pool = self.ref[kind][column].get(mp, np.empty(0))
            out[pos] = rank_in_pool(pool, values[pos], own[pos])
        return pd.Series(out, index=df.index)

    def rank(self, column: str, df: pd.DataFrame) -> pd.Series:
        return self._rank("ranked", column, df)

    def median(self, column: str, df: pd.DataFrame) -> pd.Series:
        # shortcut: a what-if row uses the cohort's median, not one recomputed with its changed volume.
        medians = self.medians.setdefault(column, {})
        if self.own is None:
            for mp, pool in self.pools[f"ranked|{column}"].items():
                medians[mp] = float(np.median(pool)) if len(pool) else np.nan
        return df["mp"].map(medians).astype(float)

    def mpq(self, base: pd.DataFrame) -> pd.DataFrame:
        cols = self.ref["num_cols"]
        return pd.DataFrame({"mpq_" + c: self._rank("mpq", c, base) for c in cols}, index=base.index)

    def features(self, raw: pd.DataFrame) -> pd.DataFrame:
        """Base and percentile features for raw rows, ranked in this cohort's population."""
        if raw is self.source:  # the cohort itself: already computed while building
            return self.own.loc[raw["id"].to_numpy()].reset_index(drop=True)
        d = fix_categories(raw)
        # A lever never moves a student to another module. fix_categories relabels M04 rows with no score and no missed
        # submission as M07, so the submit lever would otherwise turn an M04 student into an M07 one.
        module = self.own["code_module"].reindex(d["id"].astype("int64")).to_numpy()
        known = pd.notna(module)
        d.loc[known, "code_module"] = module[known]
        d["mp"] = d["code_module"] + "_" + d["code_presentation"]
        base = add_features(undo_imputation(d), self)
        return pd.concat([base, self.mpq(base)], axis=1)
