from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from app import drift
from app.model import ARTIFACTS, Model

TEST_CSV = Path(__file__).resolve().parents[2] / "data" / "test.csv"
needs_data = pytest.mark.skipif(not TEST_CSV.exists(), reason="competition data is local only")


def test_psi_is_zero_for_identical_and_grows_with_shift():
    e = np.array([0.25, 0.25, 0.25, 0.25])
    assert drift.psi(e, e) == 0
    small, large = drift.psi(e, np.array([0.3, 0.25, 0.25, 0.2])), drift.psi(e, np.array([0.7, 0.1, 0.1, 0.1]))
    assert 0 < small < drift.MODERATE < drift.SHIFT < large
    assert np.isfinite(drift.psi(e, np.array([1.0, 0, 0, 0])))  # empty bins are floored, not log(0)


def test_status_cutoffs():
    assert [drift.status(v) for v in (0.05, 0.1, 0.2, 0.21)] == ["stable", "moderate", "moderate", "shift"]


def test_reference_shares_sum_to_one():
    ref = drift.load_reference(ARTIFACTS / "drift_reference.json")
    for r in [*ref["numeric"].values(), *ref["categorical"].values()]:
        assert sum(r["shares"]) == pytest.approx(1)
    assert sum(ref["probability"]) == pytest.approx(1)


@pytest.fixture(scope="module")
def scored():
    raw = pd.read_csv(TEST_CSV)
    return raw, Model().predict_proba(raw), drift.load_reference(ARTIFACTS / "drift_reference.json")


@needs_data
def test_test_csv_is_stable_against_train(scored):
    # train and test are a random split of one population, so nothing should drift.
    raw, p, ref = scored
    r = drift.report(raw, p, ref)
    assert r["probability"]["status"] == "stable" and all(f["status"] == "stable" for f in r["features"])


@needs_data
def test_single_module_cohort_shows_module_shift(scored):
    raw, p, ref = scored
    keep = (raw.code_module.str.lower() == "m03").to_numpy()
    r = drift.report(raw[keep], p[keep], ref)
    by = {f["feature"]: f for f in r["features"]}
    assert by["code_module"]["status"] == "shift" and r["features"][0]["feature"] == "code_module"
