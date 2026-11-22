from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from app import rules

TRAIN_CSV = Path(__file__).resolve().parents[2] / "data" / "train.csv"


def test_tier_boundaries():
    p = np.array([0.0, 0.374, 0.375, 0.599, 0.6, 0.849, 0.85, 1.0])
    assert rules.tier(p).tolist() == ["low", "low", "watch", "watch", "high", "high", "critical", "critical"]


def test_uncertain_band_is_open_interval():
    assert rules.uncertain([0.25, 0.26, 0.54, 0.55]).tolist() == [False, True, True, False]


def row(**kw):
    base = dict(week1_interactions=40, week2_interactions=20, week3_interactions=20,
                week4_interactions=20, no_submission_by_cutoff=0, has_score=1, avg_score=75.0)
    base.update(kw)
    # A real activity block has volume equal to the weekly sum; pass interaction_volume to make a placeholder.
    base.setdefault("interaction_volume", sum(base[f"week{i}_interactions"] for i in range(1, 5)))
    return base


def test_archetype_order():
    df = pd.DataFrame([
        row(interaction_volume=182, no_submission_by_cutoff=1),   # placeholder + no submission
        row(interaction_volume=182),                              # placeholder only
        row(no_submission_by_cutoff=1, avg_score=10.0),           # missed submission wins over low score
        row(avg_score=59.9, week4_interactions=5),                # low score wins over fading
        row(week4_interactions=19),                               # fading: 19 < 0.5 * 40
        row(),                                                    # engaged
        row(has_score=0, avg_score=10.0),                         # placeholder score is not a low score
    ])
    assert rules.archetype(df).tolist() == ["silent", "no_lms_record", "missed_submission", "low_score",
                                            "fading", "engaged", "engaged"]


def test_every_archetype_has_a_playbook_entry():
    assert set(rules.PLAYBOOK) == set(rules.ARCHETYPES)


def test_message_fills_student_values():
    r = pd.Series(dict(code_module="GGG", assessments_due_total=2, assessment_completion_rate=0.5,
                       last_activity_day=21))
    assert "M07" in rules.message("missed_submission", r) and "1 asesmen" in rules.message("missed_submission", r)
    assert "hari ke-21" in rules.message("fading", r)


@pytest.mark.skipif(not TRAIN_CSV.exists(), reason="competition data is local only")
def test_archetype_counts_match_prd():
    counts = pd.Series(rules.archetype(pd.read_csv(TRAIN_CSV))).value_counts().to_dict()
    assert counts == {"engaged": 11115, "fading": 5608, "silent": 3045, "low_score": 2957,
                      "missed_submission": 2669, "no_lms_record": 692}
