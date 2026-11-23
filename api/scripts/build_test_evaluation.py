"""Build api/artifacts/test_evaluation.json: the served model against the real outcomes of the DSCO test cohort.

Run from api/: uv run python scripts/build_test_evaluation.py [path/to/test_outcomes.csv]
The default outcome file is data/test_outcomes.csv (id, at_risk; local only, like the rest of data/). The threshold
was fixed before these outcomes were used (expected-F1 plug-in rule), so this is an independent evaluation: never
tune, retrain, or pick features on it.
Only aggregates are written; no per-student label leaves data/. Rerun build_landing.py afterwards.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from app import evaluation, planner, quality, rules  # noqa: E402
from app.model import Model  # noqa: E402
from app.pipeline.features import normalize  # noqa: E402

import pandas as pd  # noqa: E402

DATA = ROOT.parent / "data"
OUT = ROOT / "artifacts/test_evaluation.json"
FAIRNESS = ["gender", "disability", "age_band", "imd_band", "highest_education"]


def main() -> None:
    labels_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DATA / "test_outcomes.csv"
    labels = evaluation.parse_labels(labels_path.read_bytes())

    report, typed = quality.validate(quality.read_csv((DATA / "test.csv").read_bytes()), quality.load_schema())
    assert report["can_score"], report["status"]
    model = Model()
    p = model.predict_proba(typed)
    d = normalize(typed)
    preds = pd.DataFrame(dict(source_id=typed["id"].astype(int).to_numpy(), probability=p, tier=rules.tier(p),
                              archetype=rules.archetype(typed), code_module=d.code_module.to_numpy()))
    merged, coverage = evaluation.match(preds, labels)
    assert coverage["matched"] == len(preds), coverage
    groups = {c: d[c].astype(str).reset_index(drop=True) for c in FAIRNESS}

    out = evaluation.evaluate(merged, model.threshold, groups=groups, plan_capacity=planner.OPENING)
    out = dict(cohort="Kohort uji DSCO (test.csv)", model_version=model.meta["model_version"], coverage=coverage, **out)
    OUT.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    m = out["metrics"]
    print(json.dumps(dict(coverage=coverage, f1=m["f1"], precision=m["precision"], recall=m["recall"], auc=m["auc"],
                          ece=out["calibration"]["ece"], plan=out["plan"]), indent=2))


if __name__ == "__main__":
    main()
