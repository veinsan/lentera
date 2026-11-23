"""Compute and store the drift report of a cohort scored before drift reports existed (or after a new reference).

Run from api/: uv run --env-file .env python scripts/backfill_drift.py <cohort_id> <path/to/the/uploaded.csv>
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app import drift, quality  # noqa: E402
from app.model import ARTIFACTS, Model  # noqa: E402
from app.store import SupabaseStore  # noqa: E402


def main() -> None:
    cohort_id, csv_path = sys.argv[1], Path(sys.argv[2])
    report, typed = quality.validate(quality.read_csv(csv_path.read_bytes()), quality.load_schema())
    assert report["can_score"], report["status"]
    result = drift.report(typed, Model().predict_proba(typed), drift.load_reference(ARTIFACTS / "drift_reference.json"))
    SupabaseStore().set_drift_report(cohort_id, result)
    worst = result["features"][0]
    print(f"{cohort_id}: {result['n']} rows, probability PSI {result['probability']['psi']:.4f}, "
          f"highest feature PSI {worst['feature']} {worst['psi']:.4f}")


if __name__ == "__main__":
    main()
