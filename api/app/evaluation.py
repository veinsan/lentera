"""Evaluation of stored predictions against real outcomes (labels that arrive after the week 4 cutoff).

Used by scripts/build_test_evaluation.py for the DSCO test cohort and by POST /cohorts/{id}/outcomes for any
scored cohort. Labels are only aggregated here: no per-student outcome is stored or shown, because at the week 4
cutoff the outcome is unknown and the advisor workflow must not depend on it. Free of I/O so it is unit-testable.
"""
from __future__ import annotations

import io

import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score

from app import planner, rules

MAX_LABEL_ROWS = 200_000
CAPACITY_SHARES = range(5, 101, 5)  # percent of the cohort contacted, highest probability first


def parse_labels(content: bytes) -> pd.DataFrame:
    """Read an outcome CSV with columns id and at_risk (0 or 1). Raises ValueError with a message for the user."""
    try:
        df = pd.read_csv(io.BytesIO(content), dtype=str, nrows=MAX_LABEL_ROWS + 1)
    except (ValueError, UnicodeDecodeError, pd.errors.ParserError):
        raise ValueError("File bukan CSV yang valid.") from None
    df.columns = [str(c).strip().lower() for c in df.columns]
    missing = {"id", "at_risk"} - set(df.columns)
    if missing:
        raise ValueError(f"Kolom wajib tidak ada ({', '.join(sorted(missing))}).")
    if len(df) > MAX_LABEL_ROWS:
        raise ValueError(f"File berisi lebih dari {MAX_LABEL_ROWS:,} baris.".replace(",", "."))
    df = df[["id", "at_risk"]].apply(lambda s: s.str.strip())
    ids = pd.to_numeric(df.id, errors="coerce")
    labels = pd.to_numeric(df.at_risk, errors="coerce")
    bad = ids.isna() | (ids % 1 != 0) | ~labels.isin([0, 1])
    if bad.any():
        raise ValueError(f"Sebanyak {int(bad.sum())} baris punya id yang bukan bilangan bulat atau at_risk selain 0 dan 1.")
    out = pd.DataFrame(dict(id=ids.astype("int64"), at_risk=labels.astype("int64")))
    dup = int(out.id.duplicated().sum())
    if dup:
        raise ValueError(f"Sebanyak {dup} id muncul lebih dari sekali.")
    return out


def match(predictions: pd.DataFrame, labels: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """Join predictions (source_id is the institution's student id) with labels on that id."""
    merged = predictions.merge(labels, left_on="source_id", right_on="id", how="inner", suffixes=("", "_label"))
    coverage = dict(cohort=int(len(predictions)), labels=int(len(labels)), matched=int(len(merged)),
                    without_label=int(len(predictions) - len(merged)), unknown_ids=int(len(labels) - len(merged)))
    return merged, coverage


def _binary(y: np.ndarray, p: np.ndarray, flag: np.ndarray) -> dict:
    tp, fp = int((flag & (y == 1)).sum()), int((flag & (y == 0)).sum())
    fn, tn = int((~flag & (y == 1)).sum()), int((~flag & (y == 0)).sum())
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    return dict(n=int(len(y)), base_rate=float(y.mean()), flag_rate=float(flag.mean()), precision=precision,
                recall=recall, f1=2 * precision * recall / (precision + recall) if precision + recall else 0.0,
                accuracy=(tp + tn) / len(y), auc=float(roc_auc_score(y, p)) if len(np.unique(y)) > 1 else None,
                tp=tp, fp=fp, fn=fn, tn=tn)


def evaluate(frame: pd.DataFrame, threshold: float, groups: dict[str, pd.Series] | None = None,
             plan_capacity: tuple[int, float] | None = None) -> dict:
    """frame: one row per labelled student with probability, tier, archetype, code_module, at_risk, and source_id.

    groups: optional demographic columns aligned with frame, reported per level (fairness).
    plan_capacity: (advisors, hours per advisor) to check the planner's expected reach against the outcomes.
    """
    if frame.empty:
        raise ValueError("No labelled students to evaluate")
    y = frame.at_risk.to_numpy(dtype=int)
    p = frame.probability.to_numpy(dtype=float)
    flag = p >= threshold

    bins = pd.cut(p, np.linspace(0, 1, 11), include_lowest=True)
    cal = (pd.DataFrame(dict(y=y, p=p, b=bins)).groupby("b", observed=True)
           .agg(n=("y", "size"), predicted=("p", "mean"), observed=("y", "mean")))
    calibration = dict(
        bins=[dict(lower=float(i.left), upper=float(i.right), n=int(r.n), predicted=float(r.predicted),
                   observed=float(r.observed)) for i, r in cal.iterrows()],
        ece=float((cal.n * (cal.predicted - cal.observed).abs()).sum() / cal.n.sum()),
        brier=float(np.mean((p - y) ** 2)))

    positives = max(int(y.sum()), 1)
    tiers = {t: dict(n=int(m.sum()), at_risk=int(y[m].sum()), at_risk_rate=float(y[m].mean()) if m.any() else None,
                     mean_probability=float(p[m].mean()) if m.any() else None, share_of_at_risk=float(y[m].sum() / positives))
             for _, t in rules.TIERS for m in [frame.tier.to_numpy() == t]}
    archetypes = {a: dict(n=int(m.sum()), flagged=int((m & flag).sum()), at_risk=int(y[m].sum()),
                          at_risk_rate=float(y[m].mean()) if m.any() else None,
                          mean_probability=float(p[m].mean()) if m.any() else None)
                  for a in rules.ARCHETYPES for m in [frame.archetype.to_numpy() == a]}
    modules = {str(mod): _binary(y[ix], p[ix], flag[ix]) for mod, ix in frame.groupby("code_module").indices.items()}

    order = np.argsort(-p, kind="stable")
    capacity = []
    for k in CAPACITY_SHARES:
        top = order[: int(round(len(p) * k / 100))]
        capacity.append(dict(share=k / 100, n=int(len(top)), expected_at_risk=float(p[top].sum()),
                             at_risk=int(y[top].sum()), precision=float(y[top].mean()) if len(top) else 0.0,
                             recall=float(y[top].sum() / positives)))

    report = dict(threshold=float(threshold), metrics=_binary(y, p, flag), calibration=calibration, tiers=tiers,
                  archetypes=archetypes, modules=modules, capacity=capacity,
                  expected_at_risk=float(p.sum()), at_risk=int(y.sum()))
    if groups:
        report["fairness"] = {col: {str(level): _binary(y[ix], p[ix], flag[ix])
                                    for level, ix in pd.Series(values.to_numpy()).groupby(values.to_numpy()).indices.items()}
                              for col, values in groups.items()}
    if plan_capacity:
        advisors, hours = plan_capacity
        students = frame.assign(id=frame.source_id)[["id", "probability", "archetype", "code_module"]]
        result = planner.plan(students, advisors, hours)
        contacted = {a["id"] for a in result["assignments"] if a["channel"] == "advisor"}
        hit = frame.source_id.isin(contacted).to_numpy()
        report["plan"] = dict(advisors=advisors, hours_per_advisor=float(hours), contacted=int(hit.sum()),
                              expected_at_risk=float(p[hit].sum()), at_risk=int(y[hit].sum()))
    return report
