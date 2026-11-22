import numpy as np
import pandas as pd
import pytest

from app import planner
from app.rules import ARCHETYPES


@pytest.fixture
def students():
    rng = np.random.default_rng(0)
    n = 500
    return pd.DataFrame(dict(id=np.arange(n), probability=rng.uniform(0, 1, n),
                             archetype=rng.choice(ARCHETYPES, n)))


@pytest.mark.parametrize("capacity", [0, 30, 600, 6000])
def test_capacity_and_reach(students, capacity):
    book = planner.playbook_table()
    plan = planner.allocate(students, capacity, book)
    advisor = plan[plan.channel == "advisor"]
    assert advisor.minutes.sum() <= capacity
    assert plan.loc[plan.minutes == 0, "channel"].eq("automated").all()
    summary = planner.summarize(students, plan, capacity, book)
    assert summary["expected_at_risk_reached_advisor"] == pytest.approx(advisor.probability.sum())
    assert summary["is_scenario"] is False and summary["estimated_retained_scenario"] is None


def test_only_flagged_students_are_planned(students):
    plan = planner.allocate(students, 10_000, planner.playbook_table())
    assert (plan.probability >= 0.375).all()
    assert len(plan) == (students.probability >= 0.375).sum()


def test_effectiveness_override_marks_scenario_and_changes_priority(students):
    base = planner.plan(students, advisors=1, hours_per_advisor=5)
    tuned = planner.plan(students, advisors=1, hours_per_advisor=5,
                         overrides={"silent": {"effectiveness": 0.1}, "no_lms_record": {"effectiveness": 0.1}})
    assert tuned["summary"]["is_scenario"] and tuned["summary"]["estimated_retained_scenario"] is not None
    def count(r, action):
        return sum(a["channel"] == "advisor" and a["action"] == action for a in r["assignments"])
    assert count(tuned, "admin_check") < count(base, "admin_check")


def test_invalid_override_is_rejected():
    with pytest.raises(AssertionError):
        planner.playbook_table({"fading": {"effectiveness": 1.5}})
