import numpy as np
import pandas as pd
import pytest

from app import evaluation, rules


def frame(n=600, seed=0):
    rng = np.random.default_rng(seed)
    p = rng.uniform(0, 1, n)
    return pd.DataFrame(dict(source_id=np.arange(1000, 1000 + n), probability=p, tier=rules.tier(p),
                             archetype=rng.choice(rules.ARCHETYPES, n), code_module=rng.choice(["m01", "m02"], n),
                             at_risk=(rng.uniform(0, 1, n) < p).astype(int)))


def test_parse_labels_accepts_ids_and_binary_labels():
    out = evaluation.parse_labels(b"id,at_risk\n 7 ,1\n8,0\n")
    assert out.to_dict("list") == {"id": [7, 8], "at_risk": [1, 0]}


@pytest.mark.parametrize("content, words", [
    (b"student,label\n1,0\n", "Kolom wajib"),
    (b"id,at_risk\n1,2\n", "at_risk selain 0 dan 1"),
    (b"id,at_risk\nx,1\n", "bukan bilangan bulat"),
    (b"id,at_risk\n1,1\n1,0\n", "lebih dari sekali"),
])
def test_parse_labels_rejects_bad_files(content, words):
    with pytest.raises(ValueError, match=words):
        evaluation.parse_labels(content)


def test_match_reports_coverage():
    preds = frame(10).drop(columns="at_risk")
    labels = pd.DataFrame(dict(id=[1000, 1001, 99], at_risk=[1, 0, 1]))
    merged, cov = evaluation.match(preds, labels)
    assert len(merged) == 2 and cov == dict(cohort=10, labels=3, matched=2, without_label=8, unknown_ids=1)


def test_evaluate_counts_are_consistent():
    f = frame()
    r = evaluation.evaluate(f, rules.THRESHOLD, groups={"g": f.code_module}, plan_capacity=(2, 5))
    m = r["metrics"]
    assert m["tp"] + m["fp"] + m["fn"] + m["tn"] == len(f)
    assert m["tp"] + m["fp"] == int((f.probability >= rules.THRESHOLD).sum())
    assert sum(t["n"] for t in r["tiers"].values()) == len(f)
    assert sum(t["share_of_at_risk"] for t in r["tiers"].values()) == pytest.approx(1)
    assert r["capacity"][-1]["at_risk"] == f.at_risk.sum() and r["capacity"][-1]["recall"] == pytest.approx(1)
    assert set(r["fairness"]["g"]) == {"m01", "m02"}
    assert 0 < r["plan"]["contacted"] and r["plan"]["at_risk"] <= r["plan"]["contacted"]
    # Probabilities drawn as the label's chance are calibrated, so the ECE stays small.
    assert r["calibration"]["ece"] < 0.1
