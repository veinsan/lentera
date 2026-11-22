"""SHAP reason codes. Related features are summed into one signal (SHAP is additive), then phrased in Indonesian.

Actionable signals describe behavior an intervention can change. Context signals describe who the student is or
which course they take; the app never recommends an intervention because of a context signal.
"""
from __future__ import annotations

import math

import numpy as np
import pandas as pd
from catboost import Pool

from app.model import Model

ACTIONABLE, CONTEXT = "actionable", "context"

SIGNALS: dict[str, tuple[str, list[str]]] = {
    "submission": (ACTIONABLE, [
        "no_submission_by_cutoff", "submitted_count", "submitted_Assessment_1", "submitted_Assessment_2",
        "assessment_completion_rate", "assessment_completion_rate_Assessment_1",
        "assessment_completion_rate_Assessment_2", "missed_due"]),
    "timeliness": (ACTIONABLE, [
        "late_submission_count", "avg_submission_delay", "median_submission_delay", "max_submission_delay",
        "min_submission_delay", "submission_delay_Assessment_1", "submission_delay_Assessment_2"]),
    "score": (ACTIONABLE, [
        "has_score", "avg_score", "median_score", "max_score", "min_score", "score_std", "score_trend",
        "weighted_score_total", "score_Assessment_1", "weighted_score_Assessment_1", "score_Assessment_2",
        "weighted_score_Assessment_2", "avg_score_cohort_pct"]),
    "active_days": (ACTIONABLE, ["active_days", "active_day_ratio", "active_days_cohort_pct", "active_weeks"]),
    "recency": (ACTIONABLE, [
        "last_activity_day", "days_since_last_activity", "last_activity_day_cohort_pct", "first_activity_day",
        "activity_span_days"]),
    "volume": (ACTIONABLE, [
        "interaction_volume", "interaction_volume_cohort_pct", "avg_daily_interactions", "max_daily_interactions",
        "avg_interactions_per_active_day", "avg_interactions_per_active_week", "interaction_variability",
        "inter_per_credit", "early_interactions", "week1_interactions", "week2_interactions",
        "week3_interactions"]),
    "week4_trend": (ACTIONABLE, [
        "week4_interactions", "week4_interactions_cohort_pct", "week4_share", "late_interactions",
        "late_to_early_interactions_ratio", "interaction_trend"]),
    "breadth": (ACTIONABLE, ["unique_sites", "unique_sites_cohort_pct", "unique_activity_types", "sites_per_day"]),
    "no_lms_record": (ACTIONABLE, ["no_activity"]),
    "course": (CONTEXT, [
        "code_module", "code_presentation", "cohort", "module_presentation_length", "assessments_due_total",
        "assessments_due_Assessment_1", "assessments_due_Assessment_2"]),
    "registration": (CONTEXT, ["registration_days_from_start", "registration_days_from_start_cohort_pct"]),
    "workload": (CONTEXT, ["studied_credits"]),
    "prior_attempts": (CONTEXT, ["num_of_prev_attempts"]),
    "demographics": (CONTEXT, ["gender", "region", "highest_education", "imd_band", "age_band", "disability"]),
}

LABELS = {
    "submission": "Pengumpulan asesmen", "timeliness": "Ketepatan waktu", "score": "Nilai",
    "active_days": "Hari aktif", "recency": "Aktivitas terakhir", "volume": "Volume interaksi",
    "week4_trend": "Aktivitas minggu 4", "breadth": "Ragam materi", "no_lms_record": "Catatan LMS",
    "course": "Course", "registration": "Registrasi", "workload": "Beban studi",
    "prior_attempts": "Percobaan sebelumnya", "demographics": "Demografi",
}


ACTIVITY = ["active_days", "recency", "volume", "week4_trend", "breadth"]


def _pct(v: float) -> str:
    return "tidak tersedia" if v is None or math.isnan(v) else f"persentil {round(v * 100)} di kohortnya"


def sentence(signal: str, r: pd.Series, x: pd.Series) -> str:
    """r is the raw CSV row, x the model feature row (placeholders already set to missing)."""
    placeholder = x.no_activity == 1
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
        return f"Rata-rata nilai {r.avg_score:.0f} ({_pct(x.avg_score_cohort_pct)})"
    if signal == "active_days":
        return f"Aktif {round(r.active_days)} hari dalam 4 minggu ({_pct(x.active_days_cohort_pct)})"
    if signal == "recency":
        gap = 28 - r.last_activity_day
        return f"Terakhir aktif hari ke-{round(r.last_activity_day)}, {round(gap)} hari sebelum cutoff"
    if signal == "volume":
        return f"Total {round(r.interaction_volume)} interaksi ({_pct(x.interaction_volume_cohort_pct)})"
    if signal == "week4_trend":
        return f"Interaksi minggu 4: {round(r.week4_interactions)} (minggu 1: {round(r.week1_interactions)})"
    if signal == "breadth":
        return f"Mengakses {round(r.unique_sites)} materi dan {round(r.unique_activity_types)} jenis aktivitas"
    if signal == "no_lms_record":
        return ("Data aktivitas LMS berupa placeholder, tidak ada catatan valid" if placeholder
                else "Data aktivitas LMS terekam")
    if signal == "course":
        return f"Course {x.code_module.upper()} presentasi {x.code_presentation.upper()}"
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
        cols = model.state.columns
        mapped = [f for _, fs in SIGNALS.values() for f in fs]
        assert sorted(mapped) == sorted(cols), set(mapped) ^ set(cols)
        self.index = {s: [cols.index(f) for f in fs] for s, (_, fs) in SIGNALS.items()}

    def shap(self, x: pd.DataFrame) -> np.ndarray:
        """Per-feature SHAP values; the last column is the expected value (log-odds)."""
        pool = Pool(x, cat_features=self.model.state.cats)
        return self.model.cbm.get_feature_importance(pool, type="ShapValues")

    def signal_shap(self, values: np.ndarray) -> pd.DataFrame:
        return pd.DataFrame({s: values[:, ix].sum(axis=1) for s, ix in self.index.items()})

    def reasons(self, raw: pd.DataFrame) -> list[dict]:
        """For each row: signals in each group, sorted by contribution (risk-raising first)."""
        x = self.model.state.transform(raw)
        sig = self.signal_shap(self.shap(x))
        out = []
        for i in range(len(raw)):
            r, xr = raw.iloc[i], x.iloc[i]
            row = sig.iloc[i]
            if xr.no_activity == 1:
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
