"""SHAP reason codes. Related features are summed into one signal (SHAP is additive), then phrased in Indonesian.

The values are TreeSHAP of the LightGBM half of the blend, in log-odds; the DAE-MLP half has no per-feature
attribution. Actionable signals describe behavior an intervention can change. Context signals describe who the
student is or which course they take; the app never recommends an intervention because of a context signal.
"""
from __future__ import annotations

import math

import numpy as np
import pandas as pd

from app.model import Model

ACTIONABLE, CONTEXT = "actionable", "context"

SIGNALS: dict[str, tuple[str, list[str]]] = {
    "submission": (ACTIONABLE, [
        "no_submission_by_cutoff", "submitted_count", "assessment_completion_rate",
        "assessment_completion_rate_Assessment_1", "assessment_completion_rate_Assessment_2", "recency_x_nosub"]),
    "timeliness": (ACTIONABLE, [
        "late_submission_count", "avg_submission_delay", "max_submission_delay", "min_submission_delay",
        "submission_delay_Assessment_1", "submission_delay_Assessment_2", "first_delay", "rk_first_delay"]),
    "score": (ACTIONABLE, [
        "has_score", "avg_score", "max_score", "min_score", "score_std", "score_trend", "weighted_score_total",
        "score_Assessment_1", "weighted_score_Assessment_1", "score_Assessment_2", "weighted_score_Assessment_2",
        "first_score", "score_is_practice", "score_lt40", "rk_first_score", "rk_weighted_score_total",
        "score_x_delay", "score_x_engage"]),
    "active_days": (ACTIONABLE, ["active_days", "active_weeks", "zero_weeks", "rk_active_days"]),
    "recency": (ACTIONABLE, ["last_activity_day", "first_activity_day", "activity_span_days", "recency",
                             "rk_recency"]),
    "volume": (ACTIONABLE, [
        "interaction_volume", "avg_daily_interactions", "max_daily_interactions", "avg_interactions_per_active_week",
        "interaction_variability", "early_interactions", "week1_interactions", "week2_interactions",
        "week3_interactions", "min_week", "log_volume", "vol_over_mp_median", "rk_week1", "rk_week2", "rk_week3",
        "rk_mean", "rk_min", "rk_std", "rk_interaction_volume", "rk_min_week", "rk_max_daily_interactions"]),
    "week4_trend": (ACTIONABLE, [
        "week4_interactions", "late_interactions", "late_to_early_interactions_ratio", "interaction_trend",
        "week_pattern", "stop_w4", "rk_week4"]),
    "breadth": (ACTIONABLE, ["unique_sites", "unique_activity_types", "clicks_per_site", "rk_unique_sites",
                             "rk_unique_activity_types", "rk_clicks_per_site"]),
    "no_lms_record": (ACTIONABLE, ["vle_missing"]),
    "course": (CONTEXT, [
        "code_module", "code_presentation", "mp", "module_presentation_length", "assessments_due_total",
        "assessments_due_Assessment_1", "assessments_due_Assessment_2", "assess_window", "is_B", "year2014"]),
    "registration": (CONTEXT, ["registration_days_from_start", "rk_registration_days_from_start"]),
    "workload": (CONTEXT, ["studied_credits", "extra_credits", "credits_x_prev", "rk_studied_credits"]),
    "prior_attempts": (CONTEXT, ["num_of_prev_attempts"]),
    "demographics": (CONTEXT, ["gender", "region", "highest_education", "imd_band", "age_band", "disability",
                               "edu_ord", "imd_ord", "imd_missing", "age_ord"]),
}
# The notebook's segment mixes behavior and course context, so its SHAP goes to the signal its value stands for.
SEGMENT_SIGNAL = {"A_no_vle": "no_lms_record", "B_no_assess": "course"}  # every other segment: "submission"

LABELS = {
    "submission": "Pengumpulan asesmen", "timeliness": "Ketepatan waktu", "score": "Nilai",
    "active_days": "Hari aktif", "recency": "Aktivitas terakhir", "volume": "Volume interaksi",
    "week4_trend": "Aktivitas minggu 4", "breadth": "Ragam materi", "no_lms_record": "Catatan LMS",
    "course": "Course", "registration": "Registrasi", "workload": "Beban studi",
    "prior_attempts": "Percobaan sebelumnya", "demographics": "Demografi",
}

ACTIVITY = ["active_days", "recency", "volume", "week4_trend", "breadth"]
_SIGNAL_OF = {f: s for s, (_, fs) in SIGNALS.items() for f in fs}


def signal_of(feature: str) -> str | None:
    """The signal a model feature belongs to; a module-presentation percentile (mpq_) follows its source column."""
    return _SIGNAL_OF.get(feature.removeprefix("mpq_"))


def _pct(v: float) -> str:
    return "tidak tersedia" if v is None or math.isnan(v) else f"persentil {round(v * 100)} di kohortnya"


def sentence(signal: str, r: pd.Series, x: pd.Series) -> str:
    """r is the raw CSV row, x the model feature row (placeholders already set to missing)."""
    placeholder = x.vle_missing == 1
    if signal in ACTIVITY and placeholder:
        return "Tidak ada catatan aktivitas LMS yang valid"
    if signal in {"submission", "timeliness"} and r.no_submission_by_cutoff == 0 and r.assessment_completion_rate == 0:
        # M05 and M07: identical submission columns for every student, so they say nothing about this student.
        return "Data pengumpulan di course ini sama untuk semua mahasiswa sampai minggu 4"
    if signal == "submission":
        due, missed = r.assessments_due_total, r.assessments_due_total * (1 - r.assessment_completion_rate)
        if r.no_submission_by_cutoff == 1:
            return f"Belum mengumpulkan {round(missed)} dari {round(due)} asesmen yang sudah jatuh tempo"
        return f"Sudah mengumpulkan {round(due - missed)} asesmen dari {round(due)} yang jatuh tempo"
    if signal == "timeliness":
        # submitted_count and delays are placeholders (1, -1) when nothing was submitted; completion rate is reliable.
        if r.assessment_completion_rate == 0:
            return "Belum ada pengumpulan untuk dinilai ketepatan waktunya"
        if r.late_submission_count > 0:
            return f"{round(r.late_submission_count)} pengumpulan terlambat"
        delay = r.avg_submission_delay
        if abs(delay) < 0.5:
            return "Rata-rata mengumpulkan tepat pada hari deadline"
        return f"Rata-rata mengumpulkan {abs(delay):.0f} hari {'sebelum' if delay <= 0 else 'setelah'} deadline"
    if signal == "score":
        if r.has_score == 0:
            return "Belum ada asesmen yang dinilai"
        return f"Rata-rata nilai {r.avg_score:.0f} ({_pct(x.mpq_avg_score)})"
    if signal == "active_days":
        return f"Aktif {round(r.active_days)} hari dalam 4 minggu ({_pct(x.rk_active_days)})"
    if signal == "recency":
        gap = 28 - r.last_activity_day
        return f"Terakhir aktif hari ke-{round(r.last_activity_day)}, {round(gap)} hari sebelum cutoff"
    if signal == "volume":
        return f"Total {round(r.interaction_volume)} interaksi ({_pct(x.rk_interaction_volume)})"
    if signal == "week4_trend":
        return f"Interaksi minggu 4: {round(r.week4_interactions)} (minggu 1: {round(r.week1_interactions)})"
    if signal == "breadth":
        return f"Mengakses {round(r.unique_sites)} materi dan {round(r.unique_activity_types)} jenis aktivitas"
    if signal == "no_lms_record":
        return ("Data aktivitas LMS berupa placeholder, tidak ada catatan valid" if placeholder
                else "Data aktivitas LMS terekam")
    if signal == "course":
        return f"Course {str(x.code_module).upper()} presentasi {str(x.code_presentation).upper()}"
    if signal == "registration":
        d = r.registration_days_from_start
        return f"Registrasi {abs(d):.0f} hari {'sebelum' if d < 0 else 'setelah'} course dimulai"
    if signal == "workload":
        return f"Mengambil {round(r.studied_credits)} kredit"
    if signal == "prior_attempts":
        return f"{round(r.num_of_prev_attempts)} percobaan sebelumnya di modul ini"
    return "Gabungan faktor demografi (pendidikan, IMD, usia, wilayah, gender, disabilitas)"


class Explainer:
    def __init__(self, model: Model):
        self.model = model
        cols = model.features
        unmapped = [f for f in cols if f != "segmen" and signal_of(f) is None]
        assert not unmapped, unmapped
        self.index = {s: [i for i, f in enumerate(cols) if signal_of(f) == s] for s in SIGNALS}
        self.segment = cols.index("segmen")

    def shap(self, X: pd.DataFrame) -> np.ndarray:
        """Per-feature SHAP values of the LightGBM half; the last column is its expected value (log-odds)."""
        return self.model.booster.predict(X, pred_contrib=True)

    def signal_shap(self, values: np.ndarray, X: pd.DataFrame) -> pd.DataFrame:
        sig = pd.DataFrame({s: values[:, ix].sum(axis=1) for s, ix in self.index.items()})
        target = X["segmen"].astype(str).map(SEGMENT_SIGNAL).fillna("submission").to_numpy()
        for s in np.unique(target):
            sig.loc[target == s, s] += values[target == s, self.segment]
        return sig

    def reasons(self, raw: pd.DataFrame, ctx=None, X: pd.DataFrame | None = None) -> list[dict]:
        """For each row: signals in each group, sorted by contribution (risk-raising first)."""
        if X is None:
            X = self.model.frame(raw, ctx)
        sig = self.signal_shap(self.shap(X), X)
        out = []
        for i in range(len(raw)):
            r, xr = raw.iloc[i], X.iloc[i]
            row = sig.iloc[i]
            if xr.vle_missing == 1:
                # Every activity signal of a placeholder row comes from the same missing block: report it once.
                row = row.copy()
                row["no_lms_record"] += row[ACTIVITY].sum()
                row = row.drop(ACTIVITY)
            items = {ACTIONABLE: [], CONTEXT: []}
            for s, v in row.sort_values(ascending=False).items():
                items[SIGNALS[s][0]].append(dict(signal=s, label=LABELS[s], shap=round(float(v), 4),
                                                 text=sentence(s, r, xr)))
            out.append(items)
        return out
