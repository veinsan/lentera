"""Capacity planner: one playbook intervention per flagged student within the available advisor minutes.

Value of contacting a student = calibrated probability x assumed effectiveness. With effectiveness 1.0 the value is
the expected number of truly at-risk students reached (OOF expected calibration error 0.0075).
Greedy by value per advisor minute; zero-minute interventions are always assigned.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from app.rules import PLAYBOOK, THRESHOLD, TIERS, tier


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


def _opt_int(v):
    return None if v is None or v != v else int(v)


MAX_BOARD_COLUMNS = 24  # the board shows one column per advisor; more than this is a staffing table, not a board


def _sample(col: list, per_column: int) -> list:
    """First students of a column taken round-robin across its actions, in priority order, so the sample shows
    the column's mix instead of six copies of the cheapest action."""
    by_action: dict[str, list] = {}
    for r in col:
        by_action.setdefault(r.action, []).append(r)
    queues, out = list(by_action.values()), []
    while len(out) < per_column and any(queues):
        for q in queues:
            if q and len(out) < per_column:
                out.append(q.pop(0))
    return out


def board(result: pd.DataFrame, advisors: int, hours_per_advisor: float, per_column: int = 6) -> dict:
    """Split the advisor channel into one column per advisor, in priority order.

    Each student goes to the advisor with the most minutes left, so columns stay balanced and none overflows its
    hours. A column reports its tier and action counts and a sample across its actions. The plan pools all advisor
    minutes, so a contact can fit the pool but no single advisor; `unplaced` counts those instead of overfilling.
    """
    n = min(advisors, MAX_BOARD_COLUMNS)
    if n == 0:
        return dict(columns=[], unplaced=0)
    cap = hours_per_advisor * 60
    rows = result[result.channel == "advisor"].assign(ratio=lambda r: r.value / r.minutes)
    rows = rows.sort_values(["ratio", "probability"], ascending=False)
    rows = rows.assign(tier=tier(rows.probability))
    left, cols, unplaced = [cap] * n, [[] for _ in range(n)], 0
    for row in rows.itertuples():
        i = max(range(n), key=lambda k: left[k])
        if row.minutes > left[i]:
            unplaced += 1  # fits the pooled minutes, not one advisor (or advisors exceed the column limit)
            continue
        left[i] -= row.minutes
        cols[i].append(row)
    columns = []
    for i, col in enumerate(cols):
        tiers = {name: sum(r.tier == name for r in col) for _, name in TIERS}
        actions: dict[str, int] = {}
        for r in col:
            actions[r.action] = actions.get(r.action, 0) + 1
        columns.append(dict(
            advisor=i + 1, capacity_minutes=cap, minutes_used=cap - left[i], students=len(col), tiers=tiers,
            actions=[dict(action=a, students=k) for a, k in sorted(actions.items(), key=lambda kv: -kv[1])],
            top=[dict(id=int(r.id), source_id=_opt_int(getattr(r, "source_id", None)), code_module=getattr(r, "code_module", None),
                      probability=float(r.probability), tier=r.tier, archetype=r.archetype, action=r.action,
                      minutes=float(r.minutes)) for r in _sample(col, per_column)]))
    return dict(columns=columns, unplaced=unplaced)


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
                board=board(result, advisors, hours_per_advisor),
                rules=dict(threshold=THRESHOLD, tiers=[dict(tier=name, min_probability=cut) for cut, name in TIERS]),
                assignments=result[["id", "action", "channel", "probability"]].to_dict("records"))
