"""Build web/lib/generated/landing.json: every number and star on the public landing page.

Run from api/: uv run python scripts/build_landing.py
Scores data/test.csv (the demo cohort) through the same quality gate, model, rules, and planner as an upload,
so the landing page shows the stored demo cohort without a signed-in request. Rerun after any artifact change.
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from app import planner, quality, rules  # noqa: E402
from app.explain import ACTIONABLE, SIGNALS  # noqa: E402
from app.model import Model  # noqa: E402
from app.pipeline.features import normalize  # noqa: E402

DATA = ROOT.parent / "data"
OUT = ROOT.parent / "web/lib/generated/landing.json"
ADVISORS, HOURS = 5, 10  # the planner's opening values on the capacity page
ADVISOR_MODULES = ["m03", "m06"]  # the demo advisor's modules (scripts/seed_demo_users.py)
TIER_ORDER = ["low", "watch", "high", "critical"]


def main() -> None:
    card = json.loads((ROOT / "artifacts/model_card.json").read_text(encoding="utf-8"))
    report, typed = quality.validate(quality.read_csv((DATA / "test.csv").read_bytes()), quality.load_schema())
    assert report["can_score"], report["status"]

    model = Model()
    p = model.predict_proba(typed)
    flagged = p >= model.threshold
    tiers, arch = rules.tier(p), rules.archetype(typed)
    modules = normalize(typed).code_module.to_numpy()

    students = pd.DataFrame(dict(id=typed["id"].astype(int), probability=p, archetype=arch, code_module=modules))
    plan = planner.plan(students, ADVISORS, HOURS)["summary"]

    lb = card["leaderboard"]
    data = dict(
        model=dict(
            cv_f1=card["cv"]["oof_f1"], cv_f1_sd=card["cv"]["sd_f1"], folds=len(card["cv"]["per_fold"]),
            ece=card["calibration"]["ece"], brier=card["calibration"]["brier"],
            threshold=rules.THRESHOLD,
            signals=len(SIGNALS), actionable_signals=sum(g == ACTIONABLE for g, _ in SIGNALS.values()),
            archetypes=len(rules.ARCHETYPES),
            kaggle_public=lb["selected"]["public_f1"], kaggle_private=lb["selected"]["private_f1"],
        ),
        cohort=dict(
            name="Kohort uji DSCO (test.csv)",
            scored=len(typed), flagged=int(flagged.sum()), expected_at_risk=float(p.sum()),
            uncertain=int(rules.uncertain(p).sum()),
            tiers={t: int((tiers == t).sum()) for t in TIER_ORDER},
            archetypes={a: dict(n=int((arch == a).sum()), flagged=int(((arch == a) & flagged).sum()),
                                action=rules.PLAYBOOK[a]["label"]) for a in rules.ARCHETYPES},
            modules={m: int((modules == m).sum()) for m in sorted(set(modules))},
            advisor_visible=int(np.isin(modules, ADVISOR_MODULES).sum()),
            advisor_modules=ADVISOR_MODULES,
        ),
        quality=dict(rows=report["rows"], status=report["status"],
                     repairs=[dict(code=r.get("code"), count=r.get("count")) for r in report["repairs"]]),
        plan=dict(advisors=ADVISORS, hours=HOURS, contacts=plan["advisor_contacts"],
                  reached=plan["expected_at_risk_reached_advisor"], marginal=plan["marginal_per_advisor"],
                  automated=plan["automated_contacts"], waiting=plan["unassigned"]),
        # One star per student: archetype index, tier index, probability x 1000. No IDs leave the API.
        sky=dict(archetypes=rules.ARCHETYPES, tiers=TIER_ORDER,
                 a=[rules.ARCHETYPES.index(x) for x in arch],
                 t=[TIER_ORDER.index(x) for x in tiers],
                 p=[int(round(x * 1000)) for x in p]),
    )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(json.dumps({k: v for k, v in data.items() if k != "sky"}, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
