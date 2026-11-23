"""Score a validated cohort: probability, flag, tier, uncertain band, archetype, playbook action, reason codes."""
from __future__ import annotations

import pandas as pd

from app import rules
from app.explain import Explainer
from app.model import Model, blend
from app.pipeline.features import Context, normalize


def score_cohort(model: Model, explainer: Explainer, raw: pd.DataFrame, ctx: Context | None = None) -> pd.DataFrame:
    """Each row is ranked within this cohort (pass the context built from `raw` to reuse it afterwards)."""
    raw = raw.reset_index(drop=True) if ctx is None else raw
    p_lgb, p_mlp, X = model.parts(raw, ctx or model.context(raw))
    p = blend(p_lgb, p_mlp)
    norm = normalize(raw)
    arch = rules.archetype(raw)
    return pd.DataFrame(dict(
        source_id=raw["id"].astype(int),
        code_module=norm.code_module,  # normalized: GGG and the M05/P12/261 row become m07
        code_presentation=norm.code_presentation,
        probability=p,
        flagged=p >= model.threshold,
        tier=rules.tier(p),
        uncertain=rules.uncertain(p),
        archetype=arch,
        recommended_action=[rules.PLAYBOOK[a]["action"] for a in arch],
        reasons=explainer.reasons(raw, X=X),
    ))


def summarize(scored: pd.DataFrame) -> dict:
    return dict(
        rows=int(len(scored)),
        flagged=int(scored.flagged.sum()),
        expected_at_risk=float(scored.probability.sum()),
        uncertain=int(scored.uncertain.sum()),
        tiers={t: int((scored.tier == t).sum()) for _, t in rules.TIERS},
        archetypes={a: int((scored.archetype == a).sum()) for a in rules.ARCHETYPES},
        modules={m: int(n) for m, n in scored.code_module.value_counts().sort_index().items()},
    )
