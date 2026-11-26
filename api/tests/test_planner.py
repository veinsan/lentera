import numpy as np
import pandas as pd
import pytest

from app import planner, rules
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
    assert (plan.probability >= rules.THRESHOLD).all()
    assert len(plan) == (students.probability >= rules.THRESHOLD).sum()


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


def test_board_balances_advisors_without_overflow(students):
    result = planner.plan(students, advisors=3, hours_per_advisor=2)
    cols = result["board"]["columns"]
    assert len(cols) == 3
    assert all(c["minutes_used"] <= c["capacity_minutes"] for c in cols)
    assert sum(c["students"] for c in cols) + result["board"]["unplaced"] == result["summary"]["advisor_contacts"]
    first = [c["top"][0]["probability"] for c in cols if c["top"]]
    assert first and all(len(c["top"]) <= 6 for c in cols)


def test_board_is_empty_without_advisors(students):
    assert planner.plan(students, advisors=0, hours_per_advisor=10)["board"] == dict(columns=[], unplaced=0)


def test_board_columns_report_mix_and_sample_across_actions(students):
    result = planner.plan(students, advisors=2, hours_per_advisor=4)
    for c in result["board"]["columns"]:
        assert sum(c["tiers"].values()) == c["students"] == sum(a["students"] for a in c["actions"])
        sampled = {s["action"] for s in c["top"]}
        assert len(sampled) == min(len(c["actions"]), len(c["top"]))  # one of each action before any repeat
        assert all(s["tier"] in c["tiers"] for s in c["top"])
    assert result["rules"]["threshold"] == rules.THRESHOLD


def test_plan_carries_cost_scenario_defaults(students):
    econ = planner.plan(students, advisors=1, hours_per_advisor=5)["economics"]
    assert econ["cost_per_student"] > 0 and econ["tuition"] > 0 and 0 < econ["success_rate"] <= 1
