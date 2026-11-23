"""Write artifacts/drift_reference.json: training distributions for the drift report.

Run from api/: uv run python scripts/build_drift_reference.py [path/to/dsco]
Features come from data/train.csv; the probability reference is the DSCO out-of-fold probability, which matches how the
model scores unseen students better than in-sample scores do.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.drift import build_reference  # noqa: E402
from app.model import ARTIFACTS  # noqa: E402

DATA = ROOT.parent / "data"
DSCO = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parents[1] / "dsco"


def main() -> None:
    train = pd.read_csv(DATA / "train.csv")
    oof = pd.read_csv(DSCO / "outputs/final/oof_probabilities.csv")
    assert (oof.id == train.id).all()
    ref = build_reference(train, oof.probability.to_numpy())
    assert all(np.isclose(sum(r["shares"]), 1) for r in [*ref["numeric"].values(), *ref["categorical"].values()])
    (ARTIFACTS / "drift_reference.json").write_text(json.dumps(ref, indent=1), encoding="utf-8")
    print(f"drift_reference.json: {ref['n']} training rows, {len(ref['numeric'])} numeric, "
          f"{len(ref['categorical'])} categorical features")


if __name__ == "__main__":
    main()
