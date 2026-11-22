"""Load the committed artifacts and score rows in the DSCO test.csv schema."""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from catboost import CatBoostClassifier

from app.pipeline.features import FitState

ARTIFACTS = Path(__file__).resolve().parent.parent / "artifacts"


class Model:
    def __init__(self, artifacts: Path = ARTIFACTS):
        self.meta = json.loads((artifacts / "model_meta.json").read_text())
        self.state = FitState.load(artifacts / "fit_state.json")
        self.cbm = CatBoostClassifier()
        self.cbm.load_model(str(artifacts / "model.cbm"))
        self.threshold = float(self.meta["threshold"])

    def predict_proba(self, df: pd.DataFrame) -> np.ndarray:
        return self.cbm.predict_proba(self.state.transform(df))[:, 1]
