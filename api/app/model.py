"""Load the committed artifacts and score rows in the DSCO test.csv schema.

The model is the DSCO final notebook's blend (dsco/notebooks/dsco_lgbm_dae_pair_final.ipynb): LightGBM, and an MLP on
the activations of a denoising autoencoder, with their logits averaged. Rows are ranked within their cohort's
population (app.pipeline.features.Context). The DAE-MLP runs here in numpy, so the API image needs no torch.
"""
from __future__ import annotations

import json
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd
from scipy.special import expit, logit
from sklearn.preprocessing import QuantileTransformer

from app.pipeline.features import Context

ARTIFACTS = Path(__file__).resolve().parent.parent / "artifacts"
BATCH = 2048  # rows per DAE forward pass, to bound memory on large cohorts


def blend(p_lgb: np.ndarray, p_mlp: np.ndarray) -> np.ndarray:
    """Average of the two models' logits (notebook cell 76)."""
    return expit((logit(np.clip(p_lgb, 1e-6, 1 - 1e-6)) + logit(np.clip(p_mlp, 1e-6, 1 - 1e-6))) / 2)


class Model:
    def __init__(self, artifacts: Path = ARTIFACTS):
        self.meta = json.loads((artifacts / "model_meta.json").read_text())
        self.threshold = float(self.meta["threshold"]) if self.meta["threshold"] is not None else float("nan")
        state = json.loads((artifacts / "fit_state.json").read_text())
        self.features: list[str] = state["features"]
        self.categories: dict[str, list[str]] = state["categories"]
        arrays = np.load(artifacts / "fit_state.npz")
        self.ref = dict(ranked={}, mpq={}, num_cols=state["num_cols"],
                        credits={m: {v: n for v, n in pairs} for m, pairs in state["credits"].items()})
        for key in arrays.files:
            if "|" in key:
                kind, column, mp = key.split("|")
                self.ref[kind].setdefault(column, {})[mp] = arrays[key]

        self.dae_num, self.nan_cols, self.onehot = state["dae_num"], state["nan_cols"], state["onehot"]
        self.medians = pd.Series(state["medians"])[self.dae_num]
        self.qt = QuantileTransformer(n_quantiles=state["qt_n_quantiles"], output_distribution="normal")
        self.qt.quantiles_, self.qt.references_ = arrays["qt_quantiles"], arrays["qt_references"]
        self.qt.n_quantiles_, self.qt.n_features_in_ = state["qt_n_quantiles"], len(self.dae_num)

        w = np.load(artifacts / "dae_mlp.npz")
        self.dae = [(w[f"dae_{k}_weight"].T.copy(), w[f"dae_{k}_bias"]) for k in ("l1", "l2", "l3")]
        self.head = [(w[f"head_{j}_weight"].T.copy(), w[f"head_{j}_bias"]) for j in range(3)]
        self.h_mean, self.h_std = w["h_mean"], w["h_std"]
        self.booster = lgb.Booster(model_file=str(artifacts / "lgbm.txt"))

    def context(self, cohort: pd.DataFrame) -> Context:
        """The population a cohort's rows are ranked in: training reference values plus the cohort."""
        return Context(self.ref, cohort)

    def frame(self, raw: pd.DataFrame, ctx: Context | None = None) -> pd.DataFrame:
        """LightGBM features for raw rows. Without a context the rows are scored as their own cohort."""
        f = (ctx or self.context(raw)).features(raw)
        X = f[self.features].copy()
        for c, cats in self.categories.items():
            v = X[c].astype(str)
            X[c] = pd.Categorical(v.where(v.isin(cats)), categories=cats)  # an unseen level is missing, as in training
        return X

    def dae_input(self, X: pd.DataFrame) -> np.ndarray:
        num = X[self.dae_num].astype(float)
        flags = num[self.nan_cols].isna().to_numpy(np.float32)
        num_t = self.qt.transform(num.fillna(self.medians).to_numpy())
        num_t[num.isna().to_numpy()] = 0.0
        onehot = np.stack([(X[c].astype(str) == v).to_numpy(np.float32) for c, v in self.onehot], axis=1)
        return np.hstack([num_t.astype(np.float32), flags, onehot]).astype(np.float32)

    def mlp(self, x: np.ndarray) -> np.ndarray:
        """DAE hidden layers, standardized, then the MLP head; float32 like the torch model."""
        out = []
        for start in range(0, len(x), BATCH):
            h, hidden = x[start:start + BATCH], []
            for W, b in self.dae:
                h = np.maximum(h @ W + b, 0)
                hidden.append(h)
            z = (np.concatenate(hidden, axis=1) - self.h_mean) / (self.h_std + 1e-6)
            for i, (W, b) in enumerate(self.head):
                z = z @ W + b
                if i < len(self.head) - 1:
                    z = np.maximum(z, 0)
            out.append(expit(z[:, 0]).astype(np.float64))
        return np.concatenate(out) if out else np.empty(0)

    def parts(self, raw: pd.DataFrame, ctx: Context | None = None) -> tuple[np.ndarray, np.ndarray, pd.DataFrame]:
        """LightGBM probability, DAE-MLP probability, and the LightGBM feature frame."""
        X = self.frame(raw, ctx)
        return self.booster.predict(X), self.mlp(self.dae_input(X)), X

    def predict_proba(self, raw: pd.DataFrame, ctx: Context | None = None) -> np.ndarray:
        p_lgb, p_mlp, _ = self.parts(raw, ctx)
        return blend(p_lgb, p_mlp)
