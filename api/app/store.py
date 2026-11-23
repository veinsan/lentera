"""Persistence of scored cohorts in Supabase (PostgREST and Storage) with the secret key, which bypasses RLS."""
from __future__ import annotations

import json
import math
import os
import uuid

import httpx
import pandas as pd

BATCH = 1000


def _clean(value):
    # JSON has no NaN; missing values become null.
    if isinstance(value, float) and math.isnan(value):
        return None
    return value


class SupabaseStore:
    def __init__(self, url: str | None = None, key: str | None = None):
        url = (url or os.environ["SUPABASE_URL"]).rstrip("/")
        key = key or os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        headers = {"apikey": key, "Authorization": f"Bearer {key}"}
        self.rest = httpx.Client(base_url=f"{url}/rest/v1", headers=headers, timeout=60)
        self.storage = httpx.Client(base_url=f"{url}/storage/v1", headers=headers, timeout=60)

    def save_cohort(self, *, name: str, user_id: str, csv_bytes: bytes, raw: pd.DataFrame, scored: pd.DataFrame,
                    model_version: str, quality_report: dict) -> str:
        """Store file, cohort, students, and predictions. On any failure the cohort and file are removed."""
        cohort_id = str(uuid.uuid4())
        path = f"{cohort_id}.csv"
        self.storage.post(f"/object/cohorts/{path}", content=csv_bytes,
                          headers={"Content-Type": "text/csv"}).raise_for_status()
        try:
            self._insert("cohorts", [dict(id=cohort_id, name=name, uploaded_by=user_id, storage_path=path,
                                          n_rows=len(raw), model_version=model_version, status="scored",
                                          quality_report=quality_report)])
            raw = raw.reset_index(drop=True)
            ids = {}
            for start in range(0, len(raw), BATCH):
                part, sc = raw.iloc[start:start + BATCH], scored.iloc[start:start + BATCH]
                rows = [dict(cohort_id=cohort_id, source_id=int(s.source_id), code_module=s.code_module,
                             code_presentation=s.code_presentation,
                             raw={k: _clean(v) for k, v in r.items()})
                        for r, s in zip(part.to_dict("records"), sc.itertuples())]
                for row in self._insert("students", rows, returning="id,source_id"):
                    ids[row["source_id"]] = row["id"]
            for start in range(0, len(scored), BATCH):
                sc = scored.iloc[start:start + BATCH]
                self._insert("predictions", [
                    dict(student_id=ids[int(s.source_id)], cohort_id=cohort_id, code_module=s.code_module,
                         model_version=model_version, probability=float(s.probability), flagged=bool(s.flagged),
                         tier=s.tier, uncertain=bool(s.uncertain), archetype=s.archetype,
                         recommended_action=s.recommended_action, reasons=s.reasons)
                    for s in sc.itertuples()])
        except Exception:
            self.delete_cohort(cohort_id, path)
            raise
        return cohort_id

    def get_student(self, student_id: int) -> dict | None:
        r = self.rest.get("/students", params={"id": f"eq.{student_id}", "select": "id,cohort_id,code_module,raw"})
        r.raise_for_status()
        rows = r.json()
        return rows[0] if rows else None

    def get_predictions(self, cohort_id: str) -> list[dict]:
        """All predictions of a cohort for planning, in pages of 1,000 (the PostgREST row limit)."""
        rows, start = [], 0
        while True:
            r = self.rest.get("/predictions", params={"select": "student_id,code_module,probability,archetype",
                                                      "cohort_id": f"eq.{cohort_id}", "order": "student_id"},
                              headers={"Range": f"{start}-{start + BATCH - 1}"})
            r.raise_for_status()
            page = r.json()
            rows += page
            if len(page) < BATCH:
                return rows
            start += BATCH

    def save_plan(self, *, cohort_id: str, user_id: str, params: dict, result: dict) -> int:
        return self._insert("plans", [dict(cohort_id=cohort_id, created_by=user_id, params=params, result=result)],
                            returning="id")[0]["id"]

    def delete_cohort(self, cohort_id: str, path: str) -> None:
        # Students, predictions, and plans cascade from the cohort row.
        self.rest.delete("/cohorts", params={"id": f"eq.{cohort_id}"})
        self.storage.delete(f"/object/cohorts/{path}")

    def _insert(self, table: str, rows: list[dict], returning: str | None = None) -> list[dict]:
        headers = {"Content-Type": "application/json",
                   "Prefer": "return=representation" if returning else "return=minimal"}
        params = {"select": returning} if returning else None
        # default= turns numpy scalars from pandas records into plain JSON numbers.
        body = json.dumps(rows, default=lambda o: o.item() if hasattr(o, "item") else str(o))
        r = self.rest.post(f"/{table}", content=body, headers=headers, params=params)
        r.raise_for_status()
        return r.json() if returning else []
