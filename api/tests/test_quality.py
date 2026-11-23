from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from app import quality, rules
from app.explain import Explainer
from app.model import Model
from app.scoring import score_cohort, summarize

DATA = Path(__file__).resolve().parents[2] / "data"
RUN_LABELS = DATA / "blend" / "labels.csv"
pytestmark = pytest.mark.skipif(not (DATA / "test.csv").exists(), reason="competition data is local only")


@pytest.fixture(scope="module")
def schema():
    return quality.load_schema()


@pytest.fixture(scope="module")
def text():
    return quality.read_csv((DATA / "test.csv").read_bytes())


def codes(report, level=None):
    return {c["code"] for c in report["checks"] if level is None or c["level"] == level}


def test_test_csv_passes_with_repairs(schema, text):
    report, typed = quality.validate(text, schema)
    assert report["can_score"] and report["rows"] == 6502 and typed is not None
    repairs = {r["code"]: r["count"] for r in report["repairs"]}
    assert repairs["ggg_to_m07"] == 372
    assert repairs["normalize_highest_education"] == 2843  # "A level" in test vs "A Level" in train
    assert report["shares"]["placeholder_activity"] == pytest.approx(0.1456, abs=1e-3)


@pytest.mark.skipif(not RUN_LABELS.exists(), reason="training outputs are local only")
def test_scoring_from_csv_text_reproduces_the_trained_labels(schema, text):
    _, typed = quality.validate(text, schema)
    model = Model()
    scored = score_cohort(model, Explainer(model), typed)
    ref = pd.read_csv(RUN_LABELS)  # written by scripts/train.py --finalize from the same pipeline
    assert (scored.source_id.to_numpy() == ref.id.to_numpy()).all()
    assert (scored.flagged.astype(int).to_numpy() == ref.at_risk.to_numpy()).all()
    s = summarize(scored)
    assert s["flagged"] == ref.at_risk.sum() and sum(s["tiers"].values()) == 6502
    assert set(s["archetypes"]) == set(rules.ARCHETYPES)
    assert "ggg" not in s["modules"] and s["modules"]["m07"] == 181 + 372


def test_missing_column_blocks(schema, text):
    report, typed = quality.validate(text.drop(columns=["active_days"]), schema)
    assert not report["can_score"] and typed is None and "missing_columns" in codes(report, "error")


def test_non_numeric_and_duplicate_ids_block(schema, text):
    bad = text.head(50).copy()
    bad.loc[3, "active_days"] = "sepuluh"
    report, _ = quality.validate(bad, schema)
    assert "non_numeric" in codes(report, "error")
    dup = text.head(50).copy()
    dup.loc[5, "id"] = dup.loc[4, "id"]
    report, _ = quality.validate(dup, schema)
    assert "duplicate_id" in codes(report, "error")


def test_empty_file_blocks(schema, text):
    report, _ = quality.validate(text.head(0), schema)
    assert codes(report) == {"empty"} and not report["can_score"]


def test_warnings_do_not_block(schema, text):
    odd = text.head(50).copy()
    odd.loc[0, "region"] = "Region 99"
    odd.loc[1, "assessment_completion_rate"] = "1.5"
    odd["catatan"] = "x"
    report, _ = quality.validate(odd, schema)
    assert report["can_score"] and report["status"] == "warning"
    assert {"unknown_categories", "rate_out_of_range", "extra_columns"} <= codes(report, "warning")


def test_report_is_json_serializable(schema, text):
    import json
    report, _ = quality.validate(text, schema)
    json.dumps(report)
    assert all(isinstance(c["count"], (int, type(None))) for c in report["checks"])
    assert not np.isnan(report["shares"]["no_graded_score"])
