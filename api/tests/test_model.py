from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from app.model import Model

TEST_CSV = Path(__file__).resolve().parents[2] / "data" / "test.csv"
pytestmark = pytest.mark.skipif(not TEST_CSV.exists(), reason="competition data is local only")


@pytest.fixture(scope="module")
def setup():
    model, test = Model(), pd.read_csv(TEST_CSV)
    return model, test, model.context(test)


def test_row_in_its_cohort_matches_batch(setup):
    # Ranks come from the cohort's population, so a row scored alone in that context gets its batch probability.
    model, test, ctx = setup
    batch = model.predict_proba(test, ctx)
    rows = test.sample(25, random_state=0)
    single = np.array([model.predict_proba(rows.iloc[[i]], ctx)[0] for i in range(len(rows))])
    np.testing.assert_allclose(single, batch[rows.index.to_numpy()], atol=1e-6)


def test_cohort_population_changes_ranks(setup):
    # The notebook ranks within train plus the scored cohort: the same row can score differently in another cohort.
    model, test, ctx = setup
    rows = test.sample(25, random_state=0).reset_index(drop=True)
    alone = model.predict_proba(rows)
    in_test = model.predict_proba(rows, ctx)
    assert np.isfinite(alone).all() and not np.allclose(alone, in_test, atol=1e-9)


def test_unseen_module_presentation_still_scores(setup):
    model, test, _ = setup
    row = test.iloc[[0]].copy()
    row["code_presentation"] = "P99"
    p = model.predict_proba(row)
    assert np.isfinite(p).all() and 0 <= p[0] <= 1


def test_feature_columns_follow_fit_state(setup):
    model, test, ctx = setup
    assert list(model.frame(test.head(3), ctx).columns) == model.features
