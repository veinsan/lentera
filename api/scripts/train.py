"""Train the submitted DSCO model (cat_clean_rank, seed 42) on all training rows and write the artifacts.

Mirrors dsco/eda/19_freeze_candidate.py: fit_predict(train, test, None, "cat", "clean_rank", 42).
Run from api/: uv run python scripts/train.py
"""
import hashlib
import json
import sys
from importlib.metadata import version
from pathlib import Path

import pandas as pd
from catboost import CatBoostClassifier

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.pipeline.features import FitState  # noqa: E402

DATA = Path(__file__).resolve().parents[2] / "data"
OUT = Path(__file__).resolve().parent.parent / "artifacts"
# Threshold chosen on seed-42 OOF in the DSCO nested pipeline (dsco/outputs/final/selection.json).
THRESHOLD = 0.375
PARAMS = dict(iterations=500, depth=6, learning_rate=0.05, l2_leaf_reg=3.0, loss_function="Logloss",
              random_seed=42, thread_count=8, verbose=False, allow_writing_files=False)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    train = pd.read_csv(DATA / "train.csv")
    state = FitState.fit(train)
    model = CatBoostClassifier(**PARAMS, cat_features=state.cats)
    model.fit(state.transform(train), train.at_risk.to_numpy())

    OUT.mkdir(exist_ok=True)
    model.save_model(str(OUT / "model.cbm"))
    state.save(OUT / "fit_state.json")
    meta = dict(
        model_version="cat_clean_rank-seed42-v1",
        threshold=THRESHOLD,
        params=PARAMS,
        cat_features=state.cats,
        n_features=len(state.columns),
        n_train=len(train),
        input_sha256={p: sha256(DATA / p) for p in ["train.csv", "test.csv", "sample_submission.csv"]},
        model_sha256=sha256(OUT / "model.cbm"),
        versions={p: version(p) for p in ["catboost", "pandas", "numpy", "scikit-learn"]},
    )
    (OUT / "model_meta.json").write_text(json.dumps(meta, indent=2))
    print(json.dumps(meta, indent=2))


if __name__ == "__main__":
    main()
