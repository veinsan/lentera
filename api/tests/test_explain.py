from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from app.explain import ACTIVITY, Explainer
from app.model import Model
from app.pipeline.features import placeholder_activity

TEST_CSV = Path(__file__).resolve().parents[2] / "data" / "test.csv"
pytestmark = pytest.mark.skipif(not TEST_CSV.exists(), reason="competition data is local only")


@pytest.fixture(scope="module")
def setup():
    m = Model()
    return m, Explainer(m), pd.read_csv(TEST_CSV).sample(200, random_state=1).reset_index(drop=True)


def test_shap_sums_to_raw_logit(setup):
    m, e, rows = setup
    x = m.state.transform(rows)
    values = e.shap(x)
    raw = m.cbm.predict(x, prediction_type="RawFormulaVal")
    np.testing.assert_allclose(values.sum(axis=1), raw, atol=1e-6)


def test_signal_shap_keeps_the_total(setup):
    m, e, rows = setup
    values = e.shap(m.state.transform(rows))
    np.testing.assert_allclose(e.signal_shap(values).sum(axis=1), values[:, :-1].sum(axis=1), atol=1e-9)


def test_placeholder_rows_report_activity_once(setup):
    m, e, rows = setup
    reasons = e.reasons(rows)
    placeholder = placeholder_activity(rows).to_numpy()
    assert placeholder.any() and (~placeholder).any()
    for r, ph in zip(reasons, placeholder):
        signals = {item["signal"] for item in r["actionable"]}
        assert signals.isdisjoint(ACTIVITY) if ph else set(ACTIVITY) <= signals
        assert all(item["text"] for group in r.values() for item in group)
