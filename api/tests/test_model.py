from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from app.model import Model

TEST_CSV = Path(__file__).resolve().parents[2] / "data" / "test.csv"
pytestmark = pytest.mark.skipif(not TEST_CSV.exists(), reason="competition data is local only")


@pytest.fixture(scope="module")
def setup():
    return Model(), pd.read_csv(TEST_CSV)


def test_single_row_matches_batch(setup):
    # Ranks come from the saved training references, so a row scores the same alone or in a batch.
    model, test = setup
    rows = test.sample(25, random_state=0)
    batch = model.predict_proba(rows)
    single = np.array([model.predict_proba(rows.iloc[[i]])[0] for i in range(len(rows))])
    np.testing.assert_allclose(single, batch, atol=1e-12)


def test_unseen_cohort_uses_global_reference(setup):
    model, test = setup
    row = test.iloc[[0]].copy()
    row["code_presentation"] = "P99"
    p = model.predict_proba(row)
    assert np.isfinite(p).all() and 0 <= p[0] <= 1


def test_feature_columns_follow_fit_state(setup):
    model, test = setup
    assert list(model.state.transform(test.head(3)).columns) == model.state.columns
