"""Population stability index (PSI) of a cohort against the training data.

Features are compared on their raw scale after the DSCO cleaning (`features()`), not on the cohort percentile ranks the
model reads: ranks are uniform within every cohort by construction, so they cannot drift. Missing values (placeholder
activity, no graded score) are their own bin, because a change in the missing share is itself drift.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

from app.pipeline.features import features

# Raw columns behind the most important model features (model_card importance), with Indonesian labels.
NUMERIC = {
    "avg_score": "Rata-rata nilai",
    "active_days": "Hari aktif",
    "week4_interactions": "Interaksi minggu 4",
    "last_activity_day": "Hari aktivitas terakhir",
    "studied_credits": "Kredit diambil",
    "registration_days_from_start": "Hari registrasi sebelum mulai",
    "avg_submission_delay": "Rata-rata keterlambatan pengumpulan",
    "late_to_early_interactions_ratio": "Rasio interaksi akhir dan awal",
    "unique_sites": "Jumlah materi diakses",
}
CATEGORICAL = {
    "no_submission_by_cutoff": "Belum mengumpulkan sampai cutoff",
    "code_module": "Modul",
    "highest_education": "Pendidikan terakhir",
    "imd_band": "IMD band",
}
MODERATE, SHIFT = 0.1, 0.2  # common PSI rule of thumb: below 0.1 stable, 0.1 to 0.2 moderate, above 0.2 shift
PROB_EDGES = [round(i / 10, 1) for i in range(11)]
EPS = 1e-4  # share floor so an empty bin does not give log(0)
MISSING, OTHER = "<missing>", "<other>"


def psi(expected: np.ndarray, actual: np.ndarray) -> float:
    e, a = np.maximum(expected, EPS), np.maximum(actual, EPS)
    return float(np.sum((a - e) * np.log(a / e)))


def status(value: float) -> str:
    return "shift" if value > SHIFT else "moderate" if value >= MODERATE else "stable"


def _numeric_shares(values: pd.Series, edges: list[float]) -> np.ndarray:
    v = values.to_numpy(dtype=float)
    present = v[~np.isnan(v)]
    counts = np.histogram(present, bins=[-np.inf, *edges, np.inf])[0] if len(edges) else np.array([len(present)])
    return np.append(counts, np.isnan(v).sum()) / len(v)


def _categorical_shares(values: pd.Series, categories: list[str]) -> np.ndarray:
    v = values.astype(str).where(values.astype(str).isin(categories), OTHER)
    return v.value_counts(normalize=True).reindex([*categories, OTHER], fill_value=0).to_numpy()


def build_reference(train_raw: pd.DataFrame, oof_probability: np.ndarray) -> dict:
    d = features(train_raw)
    numeric = {}
    for col in NUMERIC:
        present = d[col].dropna()
        # Decile edges; repeated values (counts, flags) collapse into fewer bins.
        edges = sorted(set(np.quantile(present, np.linspace(0.1, 0.9, 9)).round(6).tolist()))
        numeric[col] = dict(edges=edges, shares=_numeric_shares(d[col], edges).tolist())
    categorical = {}
    for col in CATEGORICAL:
        shares = d[col].astype(str).value_counts(normalize=True)
        categories = shares[shares >= 0.01].index.tolist()  # rarer levels pool into <other>
        categorical[col] = dict(categories=categories, shares=_categorical_shares(d[col], categories).tolist())
    prob = np.histogram(oof_probability, bins=PROB_EDGES)[0] / len(oof_probability)
    return dict(n=int(len(d)), numeric=numeric, categorical=categorical, probability=prob.tolist())


def load_reference(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def report(raw: pd.DataFrame, probability: np.ndarray, ref: dict) -> dict:
    d = features(raw)
    rows = []
    for col, label in NUMERIC.items():
        r = ref["numeric"][col]
        cur = _numeric_shares(d[col], r["edges"])
        rows.append(dict(feature=col, label=label, kind="numeric", psi=psi(np.array(r["shares"]), cur),
                         missing_reference=r["shares"][-1], missing_current=float(cur[-1])))
    for col, label in CATEGORICAL.items():
        r = ref["categorical"][col]
        cur = _categorical_shares(d[col], r["categories"])
        rows.append(dict(feature=col, label=label, kind="categorical", psi=psi(np.array(r["shares"]), cur)))
    for row in rows:
        row["status"] = status(row["psi"])
    rows.sort(key=lambda r: -r["psi"])
    cur = np.histogram(probability, bins=PROB_EDGES)[0] / len(probability)
    p = psi(np.array(ref["probability"]), cur)
    return dict(
        n=int(len(d)), reference_n=ref["n"], thresholds=dict(moderate=MODERATE, shift=SHIFT),
        features=rows,
        probability=dict(psi=p, status=status(p), bins=[
            dict(lower=lo, upper=hi, reference=float(e), current=float(c))
            for lo, hi, e, c in zip(PROB_EDGES[:-1], PROB_EDGES[1:], ref["probability"], cur)]),
    )
