"""Capacity planner: one playbook intervention per flagged student within the available advisor minutes.

Value of contacting a student = calibrated probability x assumed effectiveness. With effectiveness 1.0 the value is
the expected number of truly at-risk students reached (OOF expected calibration error 0.0075).
Greedy by value per advisor minute; zero-minute interventions are always assigned.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from app.rules import PLAYBOOK, THRESHOLD


def playbook_table(overrides: dict | None = None) -> pd.DataFrame:
    t = pd.DataFrame(PLAYBOOK).T[["action", "label", "minutes", "effectiveness"]]
    for arch, values in (overrides or {}).items():
        for k in ("minutes", "effectiveness"):
            if k in values:
                t.loc[arch, k] = values[k]
    t["minutes"], t["effectiveness"] = t.minutes.astype(float), t.effectiveness.astype(float)
    assert (t.minutes >= 0).all() and t.effectiveness.between(0, 1).all()
    return t


def allocate(students: pd.DataFrame, capacity_minutes: float, playbook: pd.DataFrame) -> pd.DataFrame:
    """students has id, probability, and archetype. Returns flagged students with action, minutes, value, assigned."""
    s = students[students.probability >= THRESHOLD].copy()
    s = s.join(playbook[["action", "minutes", "effectiveness"]], on="archetype")
    s["value"] = s.probability * s.effectiveness
    s["assigned"] = s.minutes.eq(0)
    queue = s[~s.assigned].assign(ratio=lambda q: q.value / q.minutes).sort_values(["ratio", "probability"],
                                                                                 ascending=False)
    # Greedy fill; skip a student who no longer fits and keep trying cheaper ones.
    left, take = float(capacity_minutes), []
    for idx, minutes in zip(queue.index, queue.minutes):
        if minutes <= left:
            left -= minutes
            take.append(idx)
    s.loc[take, "assigned"] = True
    s["channel"] = np.where(~s.assigned, "unassigned", np.where(s.minutes.eq(0), "automated", "advisor"))
    return s


def summarize(students: pd.DataFrame, plan: pd.DataFrame, capacity_minutes: float, playbook: pd.DataFrame) -> dict:
    advisor = plan[plan.channel == "advisor"]
    automated = plan[plan.channel == "automated"]
    expected_total = float(students.probability.sum())
    scenario = bool((playbook.effectiveness != 1.0).any())
    per_action = (plan.groupby(["action", "channel"]).agg(students=("probability", "size"),
                                                          expected_at_risk=("probability", "sum"),
                                                          minutes=("minutes", "sum"))
                  .reset_index().to_dict("records"))
    return dict(
        capacity_minutes=float(capacity_minutes),
        minutes_used=float(advisor.minutes.sum()),
        flagged=int(len(plan)),
        advisor_contacts=int(len(advisor)),
        automated_contacts=int(len(automated)),
        unassigned=int((plan.channel == "unassigned").sum()),
        expected_at_risk_cohort=expected_total,
        expected_at_risk_reached_advisor=float(advisor.probability.sum()),
        expected_at_risk_reached_automated=float(automated.probability.sum()),
        advisor_coverage=float(advisor.probability.sum() / expected_total) if expected_total else 0.0,
        advisor_mean_probability=float(advisor.probability.mean()) if len(advisor) else None,
        # Only meaningful as a scenario: it depends on the user's effectiveness assumptions.
        estimated_retained_scenario=float(plan[plan.assigned].value.sum()) if scenario else None,
        is_scenario=scenario,
        per_action=per_action,
    )


def reach_curve(students: pd.DataFrame, playbook: pd.DataFrame, points: int = 21) -> list[dict]:
    """Advisor reach over total advisor hours, from zero to the hours that cover every flagged student."""
    full = allocate(students, np.inf, playbook)
    max_minutes = float(full.loc[full.channel == "advisor", "minutes"].sum())
    out = []
    for minutes in np.linspace(0, max_minutes, points):
        plan = allocate(students, minutes, playbook)
        adv = plan[plan.channel == "advisor"]
        out.append(dict(hours=float(minutes / 60), advisor_contacts=int(len(adv)),
                        expected_at_risk_reached=float(adv.probability.sum()),
                        value=float(adv.value.sum())))
    return out


def plan(students: pd.DataFrame, advisors: int, hours_per_advisor: float, overrides: dict | None = None) -> dict:
    book = playbook_table(overrides)
    capacity = advisors * hours_per_advisor * 60
    result = allocate(students, capacity, book)
    summary = summarize(students, result, capacity, book)
    # Marginal value of one more advisor at the same hours: the number a staffing decision needs.
    more = allocate(students, capacity + hours_per_advisor * 60, book)
    summary["marginal_per_advisor"] = float(more.loc[more.channel == "advisor", "probability"].sum()
                                            - summary["expected_at_risk_reached_advisor"])
    return dict(summary=summary, curve=reach_curve(students, book),
                playbook=book.reset_index(names="archetype").to_dict("records"),
                assignments=result[["id", "action", "channel", "probability"]].to_dict("records"))
