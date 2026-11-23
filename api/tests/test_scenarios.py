from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from app import rules, scenarios as sc
from app.model import Model
from app.pipeline.features import WEEKS, placeholder_activity

DATA = Path(__file__).resolve().parents[2] / "data"
pytestmark = pytest.mark.skipif(not (DATA / "test.csv").exists(), reason="competition data is local only")
DERIVED = ["interaction_volume", "early_interactions", "late_interactions", "late_to_early_interactions_ratio",
           "active_weeks", "avg_interactions_per_active_week", "avg_interactions_per_active_day",
           "activity_span_days", "interaction_trend"]


@pytest.fixture(scope="module")
def setup():
    m = Model()
    test = pd.read_csv(DATA / "test.csv")
    ctx = m.context(test)
    p = pd.Series(m.predict_proba(test, ctx), index=test.id)
    flagged = test[(p >= rules.THRESHOLD).to_numpy()].sample(300, random_state=2).reset_index(drop=True)
    return m, sc.load_targets(), flagged, ctx, p


def test_recompute_reproduces_dataset_formulas():
    train = pd.read_csv(DATA / "train.csv")
    real = train[~placeholder_activity(train)].head(3000)
    out = sc.recompute_activity(real.astype({c: float for c in real.select_dtypes("integer").columns}))
    for c in DERIVED:
        np.testing.assert_allclose(out[c], real[c], atol=1e-6, err_msg=c)


@pytest.mark.parametrize("levers", [[x] for x in sc.LEVERS] + [sc.LEVERS])
def test_levers_keep_rows_consistent(setup, levers):
    _, targets, flagged, _, _ = setup
    real = flagged[~placeholder_activity(flagged)]
    out = sc.apply_levers(real, levers, targets)
    assert np.allclose(out.interaction_volume, out[WEEKS].sum(axis=1))
    assert (out.active_days <= out.last_activity_day - out.first_activity_day + 1).all()
    assert (out.last_activity_day <= 28).all() and (out[WEEKS] >= real[WEEKS].to_numpy()).all().all()


def test_submit_changes_only_missed_submissions(setup):
    _, targets, flagged, _, _ = setup
    out = sc.apply_levers(flagged, ["submit"], targets)
    missed = flagged.no_submission_by_cutoff.eq(1)
    pd.testing.assert_frame_equal(out[~missed], sc.apply_levers(flagged, [], targets)[~missed])
    assert out[missed].no_submission_by_cutoff.eq(0).all()
    assert (out[missed].assessment_completion_rate == 1).all()


def test_submit_keeps_the_module(setup):
    # fix_categories reads an M04 row with no score and no missed submission as M07; a lever must not move the student.
    m, targets, _, ctx, _ = setup
    m04 = ctx.source[(ctx.source.code_module == "M04") & ctx.source.no_submission_by_cutoff.eq(1)
                     & ctx.source.has_score.eq(0)].head(20)
    assert len(m04)
    f = ctx.features(sc.apply_levers(m04, ["submit"], targets))
    assert f.code_module.eq("M04").all() and f.assess_window.eq(1).all()


def test_unchanged_row_keeps_its_cohort_probability(setup):
    m, targets, flagged, ctx, p = setup
    real = flagged[~placeholder_activity(flagged)].head(20)
    same = m.predict_proba(sc.apply_levers(real, [], targets), ctx)
    np.testing.assert_allclose(same, p.loc[real.id].to_numpy(), atol=1e-6)


def test_counterfactual_contract(setup):
    m, targets, flagged, ctx, p = setup
    results = sc.counterfactual(m, flagged, targets, ctx)
    placeholder = placeholder_activity(flagged).to_numpy()
    np.testing.assert_allclose([r["base"] for r in results], p.loc[flagged.id].to_numpy(), atol=1e-6)
    for r, ph in zip(results, placeholder):
        assert r["applicable"] == (not ph)
        if r["best"]:
            assert r["best"]["probability"] < rules.THRESHOLD and len(r["best"]["levers"]) <= sc.MAX_LEVERS
        for s in r["single"]:
            assert s["probability"] < r["base"]  # only levers that lower risk are offered
        if r["closest"]:
            assert r["closest"]["probability"] < r["base"]
    assert any(r["best"] for r in results) and any(r["reason"] == "no_combination_below_threshold" for r in results)
