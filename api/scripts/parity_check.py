"""Check that the API pipeline reproduces the trained DSCO final model on test.csv.

Run from api/ after scripts/train.py and scripts/train.py --finalize:
  uv run python scripts/parity_check.py [path/to/dsco]
Exact: the 198 LightGBM features, the DAE input, the LightGBM probability, and the flags written by --finalize.
Close: the numpy DAE-MLP against torch (float32 kernels differ). For information: agreement with the team's Kaggle
submission of this notebook (dsco/sub_v5.csv), which ran on a GPU.
Exit code 1 when an exact check fails.
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app import rules  # noqa: E402
from app.model import Model, blend  # noqa: E402

DATA = Path(__file__).resolve().parents[2] / "data"
RUN = DATA / "blend"
DSCO = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[3] / "dsco"


def same(a: pd.Series, b: pd.Series) -> bool:
    if isinstance(a.dtype, pd.CategoricalDtype) or isinstance(b.dtype, pd.CategoricalDtype):
        return bool((a.astype(str).to_numpy() == b.astype(str).to_numpy()).all())
    x, y = a.to_numpy(float), b.to_numpy(float)
    return bool(((x == y) | (np.isnan(x) & np.isnan(y))).all())


def main() -> int:
    m = Model()
    test = pd.read_csv(DATA / "test.csv").sort_values("id").reset_index(drop=True)
    trained = pd.read_pickle(RUN / "features_test.pkl")
    run = pd.read_csv(RUN / "test_pred.csv")
    labels = pd.read_csv(RUN / "labels.csv").set_index("id").loc[test.id]
    assert (run.id.to_numpy() == test.id.to_numpy()).all()

    ctx = m.context(test)
    X = m.frame(test, ctx)
    features_differ = [c for c in m.features if not same(X[c], trained["X_test"][c].reset_index(drop=True))]
    dae_diff = float(np.abs(m.dae_input(X) - trained["dae_test"]).max())
    p_lgb, p_mlp = m.booster.predict(X), m.mlp(m.dae_input(X))
    p = blend(p_lgb, p_mlp)
    flags = (p >= m.threshold).astype(int)
    sub_v5 = DSCO / "sub_v5.csv"
    kaggle = pd.read_csv(sub_v5).set_index("id").loc[test.id, "at_risk"].to_numpy() if sub_v5.exists() else None

    report = dict(
        model_version=m.meta["model_version"],
        rows=len(test),
        features_differ=features_differ,
        dae_input_max_abs_diff=dae_diff,
        lightgbm_max_abs_diff=float(np.abs(p_lgb - run.prob_lgb).max()),
        dae_mlp_max_abs_diff_vs_torch=float(np.abs(p_mlp - run.prob_mlp).max()),
        blend_max_abs_diff_vs_torch=float(np.abs(p - run.prob).max()),
        threshold=m.threshold,
        threshold_in_rules=rules.THRESHOLD,
        flagged=int(flags.sum()),
        label_matches_finalize=int((flags == labels.at_risk.to_numpy()).sum()),
        label_matches_torch_run=int((flags == run.at_risk.to_numpy()).sum()),
        label_matches_kaggle_sub_v5=None if kaggle is None else int((flags == kaggle).sum()),
        rows_within_0_001_of_threshold=int((np.abs(p - m.threshold) < 0.001).sum()),
        versions=m.meta["versions"],
    )
    print(json.dumps(report, indent=2))
    exact = (not features_differ and dae_diff == 0 and report["lightgbm_max_abs_diff"] == 0
             and report["label_matches_finalize"] == len(test) and m.threshold == rules.THRESHOLD)
    return 0 if exact else 1


if __name__ == "__main__":
    sys.exit(main())
