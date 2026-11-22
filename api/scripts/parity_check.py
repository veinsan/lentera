"""Check that the committed artifacts reproduce the submitted DSCO predictions.

Run from api/: uv run python scripts/parity_check.py [path/to/dsco]
Exit code 1 when any test label differs from the submitted file.
"""
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.model import Model  # noqa: E402

DATA = Path(__file__).resolve().parents[2] / "data"
DSCO = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[3] / "dsco"
SUBMITTED_SHA = "7e36b66a4e94eb846e83afa3a48ab3e36388bc61fffc9437457be020d4838c66"


def main() -> int:
    sub_path = DSCO / "outputs/final/submission.csv"
    # Git on Windows may check the file out with CRLF; the documented hash is of the LF file.
    lf_bytes = sub_path.read_bytes().replace(b"\r\n", b"\n")
    assert hashlib.sha256(lf_bytes).hexdigest() == SUBMITTED_SHA, "reference submission changed"
    ref = pd.read_csv(sub_path)
    ref_p = pd.read_csv(DSCO / "outputs/final/test_probabilities.csv")
    test = pd.read_csv(DATA / "test.csv")
    assert (test.id.to_numpy() == ref.id.to_numpy()).all(), "test id order differs from submission"

    m = Model()
    p = m.predict_proba(test)
    labels = (p >= m.threshold).astype(int)
    matches = int((labels == ref.at_risk.to_numpy()).sum())
    diff = np.abs(p - ref_p.set_index("id").loc[test.id, "probability"].to_numpy())
    report = dict(
        model_version=m.meta["model_version"],
        rows=len(test),
        label_matches=matches,
        max_abs_probability_diff=float(diff.max()),
        rows_within_0_01_of_threshold=int((np.abs(p - m.threshold) < 0.01).sum()),
        flagged=int(labels.sum()),
        versions=m.meta["versions"],
    )
    print(json.dumps(report, indent=2))
    return 0 if matches == len(test) else 1


if __name__ == "__main__":
    sys.exit(main())
