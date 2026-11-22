"""Data quality gate for an uploaded week 4 cohort CSV (DSCO test.csv schema).

Errors block scoring; warnings and repairs are reported. Messages are Indonesian interface text.
"""
from __future__ import annotations

import io
import json
from pathlib import Path

import numpy as np
import pandas as pd

from app.model import ARTIFACTS
from app.pipeline.features import WEEKS, normalize, placeholder_activity

MAX_ROWS = 50_000
RATE_COLUMNS = ["assessment_completion_rate", "assessment_completion_rate_Assessment_1",
                "assessment_completion_rate_Assessment_2"]
NON_NEGATIVE = ["interaction_volume", "active_days", *WEEKS, "studied_credits", "assessments_due_total"]


def load_schema(artifacts: Path = ARTIFACTS) -> dict:
    return json.loads((artifacts / "input_schema.json").read_text())


def read_csv(content: bytes) -> pd.DataFrame:
    return pd.read_csv(io.BytesIO(content), dtype=str, keep_default_na=True)


def _check(checks: list, code: str, level: str, message: str, count: int | None = None, details=None) -> None:
    checks.append(dict(code=code, level=level, message=message, count=count, details=details))


def validate(text_frame: pd.DataFrame, schema: dict) -> tuple[dict, pd.DataFrame | None]:
    """Return (report, typed frame or None). The typed frame is ready for scoring when report['can_score']."""
    checks, repairs = [], []
    df = text_frame.copy()
    df.columns = [c.strip() for c in df.columns]
    n = len(df)

    if n == 0:
        _check(checks, "empty", "error", "File tidak berisi baris data.")
        return _report(checks, repairs, n, None), None
    if n > MAX_ROWS:
        _check(checks, "too_many_rows", "error", f"Jumlah baris melebihi batas {MAX_ROWS:,}.".replace(",", "."), n)
        return _report(checks, repairs, n, None), None

    missing = [c for c in schema["columns"] if c not in df.columns]
    if missing:
        _check(checks, "missing_columns", "error", "Kolom wajib tidak ditemukan.", len(missing), missing)
        return _report(checks, repairs, n, None), None
    extra = [c for c in df.columns if c not in schema["columns"] and c != "at_risk"]
    if extra:
        _check(checks, "extra_columns", "warning", "Kolom tambahan diabaikan.", len(extra), extra)

    ids = pd.to_numeric(df["id"], errors="coerce")
    if ids.isna().any() or (ids % 1 != 0).any():
        _check(checks, "invalid_id", "error", "Kolom id kosong atau bukan bilangan bulat.", int(ids.isna().sum()))
    elif ids.duplicated().any():
        _check(checks, "duplicate_id", "error", "Ada id yang muncul lebih dari sekali.", int(ids.duplicated().sum()))

    bad_numeric = {}
    for c in schema["numeric"]:
        parsed = pd.to_numeric(df[c], errors="coerce")
        bad = int((parsed.isna() & df[c].notna()).sum())
        if bad:
            bad_numeric[c] = bad
        df[c] = parsed
    if bad_numeric:
        _check(checks, "non_numeric", "error", "Ada nilai bukan angka di kolom numerik.", sum(bad_numeric.values()), bad_numeric)

    nulls = {c: int(df[c].isna().sum()) for c in schema["columns"] if c != "id" and df[c].isna().any()}
    if nulls:
        _check(checks, "missing_values", "warning", "Ada sel kosong; model memperlakukannya sebagai nilai hilang.",
               sum(nulls.values()), nulls)

    if any(level == "error" for level in (c["level"] for c in checks)):
        return _report(checks, repairs, n, None), None

    df["id"] = ids.astype(int)
    out_of_range = {c: int(((df[c] < 0) | (df[c] > 1)).sum()) for c in RATE_COLUMNS}
    negative = {c: int((df[c] < 0).sum()) for c in NON_NEGATIVE}
    if any(out_of_range.values()):
        _check(checks, "rate_out_of_range", "warning", "Tingkat penyelesaian di luar rentang 0 sampai 1.",
               sum(out_of_range.values()), {k: v for k, v in out_of_range.items() if v})
    if any(negative.values()):
        _check(checks, "negative_counts", "warning", "Ada hitungan aktivitas atau kredit yang negatif.",
               sum(negative.values()), {k: v for k, v in negative.items() if v})

    placeholder = placeholder_activity(df)
    real = df[~placeholder]
    w = real[WEEKS].to_numpy(float)
    formula = int((~np.isclose(real.early_interactions, w[:, :2].sum(axis=1)) |
                   ~np.isclose(real.late_interactions, w[:, 2:].sum(axis=1))).sum())
    if formula:
        _check(checks, "formula_mismatch", "warning",
               "Interaksi awal/akhir tidak sama dengan jumlah interaksi mingguan.", formula)

    # Repairs the pipeline applies, made visible to the coordinator.
    raw_module = df.code_module.astype(str).str.strip().str.lower()
    ggg = int(raw_module.eq("ggg").sum())
    if ggg:
        repairs.append(dict(code="ggg_to_m07", message="Label modul GGG dipetakan ke M07.", count=ggg))
    odd = int((raw_module.eq("m05") & df.code_presentation.astype(str).str.strip().str.lower().eq("p12")
               & df.module_presentation_length.eq(261)).sum())
    if odd:
        repairs.append(dict(code="m05_to_m07", message="Baris M05/P12 berdurasi 261 hari dipetakan ke M07.", count=odd))
    norm = normalize(df)
    for c in schema["categorical"]:
        raw = df[c].astype(str)
        relabeled = int((~raw.isin(schema["raw_categories"][c]) & norm[c].isin(schema["known_categories"][c])).sum())
        if relabeled and c != "code_module":
            repairs.append(dict(code=f"normalize_{c}", message=f"Penulisan label {c} diseragamkan (huruf besar/kecil, spasi).",
                                count=relabeled))
    unknown = {c: norm.loc[~norm[c].isin(schema["known_categories"][c]), c].value_counts().to_dict()
               for c in schema["categorical"]}
    unknown = {c: {str(k): int(v) for k, v in vals.items()} for c, vals in unknown.items() if vals}
    if unknown:
        _check(checks, "unknown_categories", "warning", "Ada kategori yang tidak dikenal model dari data train.",
               sum(sum(v.values()) for v in unknown.values()), unknown)

    ref = schema["reference"]
    shares = dict(
        placeholder_activity=float(placeholder.mean()), placeholder_activity_train=ref["placeholder_activity_share"],
        no_graded_score=float(df.has_score.eq(0).mean()), no_graded_score_train=ref["no_graded_score_share"],
        no_submission=float(df.no_submission_by_cutoff.eq(1).mean()), no_submission_train=ref["no_submission_share"],
    )
    _check(checks, "placeholder_activity", "info",
           "Baris dengan blok aktivitas placeholder (tidak ada catatan LMS valid).", int(placeholder.sum()))
    return _report(checks, repairs, n, shares), df[schema["columns"]]


def _report(checks: list, repairs: list, rows: int, shares: dict | None) -> dict:
    levels = {c["level"] for c in checks}
    status = "error" if "error" in levels else "warning" if "warning" in levels else "ok"
    return dict(status=status, can_score=status != "error", rows=rows, checks=checks, repairs=repairs, shares=shares)
