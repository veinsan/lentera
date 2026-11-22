"""Build api/artifacts/input_schema.json: the cohort CSV contract used by the data quality gate.

Run from api/: uv run python scripts/build_input_schema.py
The column order is the DSCO test.csv header; categories and reference shares come from train.csv.
"""
import json
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from app.pipeline.features import normalize, placeholder_activity  # noqa: E402

DATA = ROOT.parent / "data"


def main() -> None:
    train = pd.read_csv(DATA / "train.csv")
    header = list(pd.read_csv(DATA / "test.csv", nrows=0).columns)
    norm = normalize(train)
    categorical = [c for c in header if c != "id" and not pd.api.types.is_numeric_dtype(train[c])]
    numeric = [c for c in header if c != "id" and c not in categorical]
    schema = dict(
        columns=header,
        id_column="id",
        categorical=categorical,
        numeric=numeric,
        raw_categories={c: sorted(train[c].dropna().astype(str).unique().tolist()) for c in categorical},
        known_categories={c: sorted(norm[c].unique().tolist()) for c in categorical},
        reference=dict(
            placeholder_activity_share=float(placeholder_activity(train).mean()),
            no_graded_score_share=float(train.has_score.eq(0).mean()),
            no_submission_share=float(train.no_submission_by_cutoff.eq(1).mean()),
            rows=len(train),
        ),
    )
    (ROOT / "artifacts/input_schema.json").write_text(json.dumps(schema, indent=2))
    print(f"{len(header)} columns: {len(categorical)} categorical, {len(numeric)} numeric")


if __name__ == "__main__":
    main()
