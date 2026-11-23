"""Train the DSCO final model on all training rows and write the API artifacts.

Port of dsco/notebooks/dsco_lgbm_dae_pair_final.ipynb (cells 17 to 81): the same features over train and test
together, folds, LightGBM parameters, denoising autoencoder with swap noise, and MLP head on its activations; the
probability is the average of both models' logits. The notebook ran on a Kaggle GPU and this runs on CPU, so the
DAE-MLP half matches it closely but not bit for bit.

Writes api/artifacts: lgbm.txt, dae_mlp.npz, fit_state.npz, fit_state.json, model_meta.json.
Writes data/blend (local only): oof.csv, test_pred.csv, features_test.pkl, summary.json.
`--finalize` scores test.csv through the API pipeline (app.model), applies the notebook's expected-F1 plug-in rule,
and stores the resulting threshold in model_meta.json.

Run from api/ (torch is a training-only dependency, not part of the API image):
  uv run --frozen --with torch==2.15.0 python scripts/train.py   (--frozen uses uv.lock as is, without re-locking)
  uv run --frozen python scripts/train.py --finalize
"""
from __future__ import annotations

import hashlib
import json
import math
import os
import random
import sys
import time
from importlib.metadata import version
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd
from scipy.special import expit, logit
from sklearn.metrics import f1_score, log_loss, roc_auc_score
from sklearn.model_selection import StratifiedKFold
from sklearn.preprocessing import QuantileTransformer

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from app.pipeline.features import (CAT_COLS, RANKED, FrameStats, add_features, fix_categories,  # noqa: E402
                                   undo_imputation)
from app.rules import plugin_labels  # noqa: E402

DATA = ROOT.parent / "data"
OUT = ROOT / "artifacts"
RUN = DATA / "blend"
VERSION = "lgbm_dae_pair-seed42-v1"
SEED = 42
N_FOLDS = 5
LGB_PARAMS = {
    "objective": "binary", "learning_rate": 0.01, "num_leaves": 15, "min_child_samples": 100,
    "subsample": 0.7, "subsample_freq": 1, "colsample_bytree": 0.4, "reg_lambda": 5.0,
    "n_estimators": 1405, "seed": 42, "bagging_seed": 42, "feature_fraction_seed": 42,
    "data_random_seed": 42, "deterministic": True, "force_row_wise": True, "num_threads": 8, "verbosity": -1,
}
DAE = dict(noise=0.15, hidden=1500, epochs=300, batch=256, lr=1e-3, wd=1e-5)
HEAD = dict(max_epochs=60, batch=256, lr=3e-4, wd=1e-4)


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def sha256(*paths: Path) -> str:
    h = hashlib.sha256()
    for p in paths:
        h.update(p.read_bytes())
    return h.hexdigest()


def split(full: pd.DataFrame, extra_drop=()):
    """Notebook cell 54: categoricals with the categories seen in train and test."""
    tr = full[full.is_test == 0].reset_index(drop=True)
    te = full[full.is_test == 1].reset_index(drop=True)
    feats = [c for c in full.columns if c not in ("id", "at_risk", "is_test") + tuple(extra_drop)]
    for c in feats:
        if c in CAT_COLS or not pd.api.types.is_numeric_dtype(full[c]):
            cats = sorted(full[c].astype(str).unique())
            tr[c] = pd.Categorical(tr[c].astype(str), categories=cats)
            te[c] = pd.Categorical(te[c].astype(str), categories=cats)
    return tr, te, feats


def blend_logit(a, b):
    return expit((logit(np.clip(a, 1e-6, 1 - 1e-6)) + logit(np.clip(b, 1e-6, 1 - 1e-6))) / 2)


def pools(frame: pd.DataFrame, columns: list[str]) -> dict[str, dict[str, np.ndarray]]:
    return {c: {mp: np.sort(g[c].dropna().to_numpy(float)) for mp, g in frame.groupby("mp")} for c in columns}


def train() -> None:
    import torch
    import torch.nn as nn

    def seed_everything(seed: int) -> None:
        os.environ["PYTHONHASHSEED"] = str(seed)
        random.seed(seed)
        np.random.seed(seed)
        torch.manual_seed(seed)
        torch.use_deterministic_algorithms(True)

    torch.set_num_threads(min(16, os.cpu_count() or 1))
    seed_everything(SEED)
    RUN.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(exist_ok=True)

    train_df = pd.read_csv(DATA / "train.csv").sort_values("id").reset_index(drop=True)
    test_df = pd.read_csv(DATA / "test.csv").sort_values("id").reset_index(drop=True)
    log(f"train {train_df.shape} test {test_df.shape} torch {torch.__version__} threads {torch.get_num_threads()}")

    full = pd.concat([train_df.assign(is_test=0), test_df.assign(is_test=1)], ignore_index=True)
    full = add_features(undo_imputation(fix_categories(full)), FrameStats())
    tr0, te0, base_features = split(full)
    num_cols = [c for c in base_features if str(tr0[c].dtype) != "category"]
    full = pd.concat([full, full.groupby("mp")[num_cols].rank(pct=True).add_prefix("mpq_")], axis=1)
    tr, te, features = split(full)
    X, y, X_test = tr[features], tr["at_risk"].values.astype(int), te[features]
    log(f"base features {len(base_features)} (numeric {len(num_cols)}), total {len(features)}")

    # LightGBM: out-of-fold and the full refit (cells 59 and 61).
    strat = tr["code_module"].astype(str) + "_" + tr["at_risk"].astype(str)
    folds = np.full(len(tr), -1)
    for f, (_, va) in enumerate(StratifiedKFold(N_FOLDS, shuffle=True, random_state=SEED).split(tr, strat)):
        folds[va] = f
    oof_lgb = np.zeros(len(tr))
    for f in range(N_FOLDS):
        trn, val = folds != f, folds == f
        model = lgb.LGBMClassifier(**LGB_PARAMS)
        model.fit(X[trn], y[trn])
        oof_lgb[val] = model.predict_proba(X[val])[:, 1]
        log(f"lgb fold {f}: auc {roc_auc_score(y[val], oof_lgb[val]):.5f}")
    lgb_model = lgb.LGBMClassifier(**LGB_PARAMS)
    lgb_model.fit(X, y)
    prob_lgb = lgb_model.predict_proba(X_test)[:, 1]
    lgb_model.booster_.save_model(str(OUT / "lgbm.txt"))
    log(f"lgb OOF auc {roc_auc_score(y, oof_lgb):.5f}; test mean prob {prob_lgb.mean():.4f}")

    # DAE input over train and test together (cell 64).
    both = pd.concat([tr0[base_features], te0[base_features]], ignore_index=True)
    dae_cat = [c for c in base_features if str(both[c].dtype) == "category"]
    dae_num = [c for c in base_features if c not in dae_cat]
    num = both[dae_num].astype(float)
    nan_cols = [c for c in dae_num if num[c].isna().any()]
    flags = num[nan_cols].isna().astype(np.float32).values
    medians = num.median()
    qt = QuantileTransformer(n_quantiles=1000, output_distribution="normal", random_state=SEED)
    num_t = qt.fit_transform(num.fillna(medians).values)
    num_t[num[dae_num].isna().values] = 0.0
    dummies = pd.get_dummies(both[dae_cat].astype(str), dtype=np.float32)
    X_all = np.hstack([num_t.astype(np.float32), flags, dummies.values]).astype(np.float32)
    # get_dummies names columns "<column>_<value>" with sorted values; record the pairs in that order.
    onehot = []
    for c in dae_cat:
        for v in sorted(both[c].astype(str).unique()):
            onehot.append([c, v])
    assert [f"{c}_{v}" for c, v in onehot] == list(dummies.columns), "one-hot column order differs from get_dummies"
    log(f"DAE input {X_all.shape} (numeric {len(dae_num)}, flags {len(nan_cols)}, one-hot {dummies.shape[1]})")

    class DAENet(nn.Module):
        def __init__(self, d, h):
            super().__init__()
            self.l1, self.l2, self.l3 = nn.Linear(d, h), nn.Linear(h, h), nn.Linear(h, h)
            self.out = nn.Linear(h, d)
            self.act = nn.ReLU()

        def forward(self, x, return_hidden=False):
            h1 = self.act(self.l1(x))
            h2 = self.act(self.l2(h1))
            h3 = self.act(self.l3(h2))
            if return_hidden:
                return torch.cat([h1, h2, h3], 1)
            return self.out(h3)

    def swap_noise(x, p, gen):
        mask = torch.rand(x.shape, generator=gen) < p
        idx = torch.randint(0, x.shape[0], x.shape, generator=gen)
        return torch.where(mask, torch.gather(x, 0, idx), x)

    # DAE training (cell 68).
    seed_everything(SEED)
    X_t = torch.tensor(X_all)
    dae = DAENet(X_t.shape[1], DAE["hidden"])
    opt = torch.optim.AdamW(dae.parameters(), lr=DAE["lr"], weight_decay=DAE["wd"])
    total_steps = DAE["epochs"] * ((len(X_t) + DAE["batch"] - 1) // DAE["batch"])
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=DAE["lr"], total_steps=total_steps, pct_start=0.05)
    gen = torch.Generator().manual_seed(SEED)
    t0 = time.time()
    for ep in range(DAE["epochs"]):
        perm = torch.randperm(len(X_t), generator=gen)
        tot = 0.0
        for i in range(0, len(X_t), DAE["batch"]):
            xb = X_t[perm[i:i + DAE["batch"]]]
            xn = swap_noise(xb, DAE["noise"], gen) if len(xb) > 1 else xb
            loss = ((dae(xn) - xb) ** 2).mean()
            opt.zero_grad(set_to_none=True)
            loss.backward()
            opt.step()
            sched.step()
            tot += loss.item() * len(xb)
        if ep < 3 or ep % 25 == 0 or ep == DAE["epochs"] - 1:
            per_ep = (time.time() - t0) / (ep + 1)
            log(f"DAE epoch {ep}: recon {tot / len(X_t):.4f} ({per_ep:.1f}s/epoch, "
                f"~{per_ep * (DAE['epochs'] - ep - 1) / 60:.0f} min left)")
    dae.eval()
    with torch.no_grad():
        H = torch.cat([dae(X_t[i:i + 4096], return_hidden=True) for i in range(0, len(X_t), 4096)]).numpy()

    class Head(nn.Module):
        def __init__(self, d):
            super().__init__()
            self.net = nn.Sequential(nn.Dropout(0.3), nn.Linear(d, 512), nn.ReLU(), nn.Dropout(0.3), nn.Linear(512, 128),
                                     nn.ReLU(), nn.Dropout(0.2), nn.Linear(128, 1))

        def forward(self, x):
            return self.net(x).squeeze(1)

    n_tr = len(tr)
    h_mean, h_std = H[:n_tr].mean(0), H[:n_tr].std(0)
    Hs = (H - h_mean) / (h_std + 1e-6)
    H_tr = torch.tensor(Hs[:n_tr], dtype=torch.float32)
    H_te = torch.tensor(Hs[n_tr:], dtype=torch.float32)
    y_t = torch.tensor(y, dtype=torch.float32)

    def train_head(idx_tr, idx_va, n_ep):
        """Cell 70: the epoch with the lowest validation log loss is kept when a validation fold is given."""
        torch.manual_seed(SEED)
        m = Head(H_tr.shape[1])
        o = torch.optim.AdamW(m.parameters(), lr=HEAD["lr"], weight_decay=HEAD["wd"])
        g = torch.Generator().manual_seed(SEED)
        best = (1e9, 0, None)
        for ep in range(n_ep):
            m.train()
            perm = idx_tr[torch.randperm(len(idx_tr), generator=g)]
            for i in range(0, len(perm), HEAD["batch"]):
                b = perm[i:i + HEAD["batch"]]
                loss = nn.functional.binary_cross_entropy_with_logits(m(H_tr[b]), y_t[b])
                o.zero_grad(set_to_none=True)
                loss.backward()
                o.step()
            if idx_va is not None:
                m.eval()
                with torch.no_grad():
                    p = torch.sigmoid(m(H_tr[idx_va])).numpy()
                ll = log_loss(y[idx_va.numpy()], p)
                if ll < best[0]:
                    best = (ll, ep + 1, p)
        return m, best

    oof_mlp = np.zeros(n_tr)
    best_eps = []
    for f in range(N_FOLDS):
        itr = torch.tensor(np.where(folds != f)[0])
        iva = torch.tensor(np.where(folds == f)[0])
        _, (ll, ep, p) = train_head(itr, iva, HEAD["max_epochs"])
        oof_mlp[folds == f] = p
        best_eps.append(ep)
        log(f"head fold {f}: logloss {ll:.4f} epoch {ep} auc {roc_auc_score(y[folds == f], p):.5f}")
    n_ep = int(np.mean(best_eps))
    mlp_final, _ = train_head(torch.arange(n_tr), None, n_ep)
    mlp_final.eval()
    with torch.no_grad():
        prob_mlp = torch.sigmoid(mlp_final(H_te)).numpy().astype(np.float64)
    log(f"DAE-MLP OOF auc {roc_auc_score(y, oof_mlp):.5f}; refit epochs {n_ep}; test mean prob {prob_mlp.mean():.4f}")

    # Artifacts for the API: weights as float32 arrays, the inference path is numpy (app/model.py).
    sd, head = dae.state_dict(), mlp_final.net
    np.savez_compressed(
        OUT / "dae_mlp.npz",
        **{f"dae_{k}_{p}": sd[f"{k}.{p}"].numpy() for k in ("l1", "l2", "l3") for p in ("weight", "bias")},
        **{f"head_{j}_{p}": getattr(head[i], p).detach().numpy() for j, i in enumerate((1, 4, 7))
           for p in ("weight", "bias")},
        h_mean=h_mean.astype(np.float32), h_std=h_std.astype(np.float32))
    train_rows = full[full.is_test == 0]
    ranked, mpq = pools(train_rows, RANKED), pools(train_rows, num_cols)
    np.savez_compressed(
        OUT / "fit_state.npz",
        qt_quantiles=qt.quantiles_, qt_references=qt.references_,
        **{f"ranked|{c}|{mp}": a for c, d in ranked.items() for mp, a in d.items()},
        **{f"mpq|{c}|{mp}": a for c, d in mpq.items() for mp, a in d.items()})
    credits = {m: [[float(v), int(n)] for v, n in g.value_counts().sort_index().items()]
               for m, g in train_rows.groupby("code_module")["studied_credits"]}
    state = dict(
        base_features=base_features, num_cols=num_cols, features=features,
        categories={c: list(tr[c].cat.categories) for c in features if str(tr[c].dtype) == "category"},
        dae_num=dae_num, dae_cat=dae_cat, nan_cols=nan_cols, medians={c: float(v) for c, v in medians.items()},
        onehot=onehot, qt_n_quantiles=int(qt.n_quantiles_), credits=credits, ranked=RANKED)
    (OUT / "fit_state.json").write_text(json.dumps(state, indent=1))

    # Run outputs (cells 78 and 81), with the probabilities the notebook would write.
    prob_blend = blend_logit(prob_lgb, prob_mlp)
    test_label = plugin_labels(prob_blend)
    pd.DataFrame({"id": te["id"], "prob_lgb": prob_lgb, "prob_mlp": prob_mlp, "prob": prob_blend,
                  "at_risk": test_label}).to_csv(RUN / "test_pred.csv", index=False)
    oof_blend = blend_logit(oof_lgb, oof_mlp)
    pd.DataFrame({"id": tr["id"], "fold": folds, "oof_lgb": oof_lgb, "oof_mlp": oof_mlp,
                  "oof_blend": oof_blend}).to_csv(RUN / "oof.csv", index=False)
    pd.to_pickle(dict(X_test=X_test, dae_test=X_all[n_tr:]), RUN / "features_test.pkl")
    rows = []
    for name, p in [("LightGBM", oof_lgb), ("DAE-MLP", oof_mlp), ("Blend", oof_blend)]:
        lab = plugin_labels(p)
        rows.append(dict(model=name, auc=roc_auc_score(y, p), logloss=log_loss(y, p), f1_plugin=f1_score(y, lab),
                         positive_rate=float(lab.mean()),
                         fold_f1=[f1_score(y[folds == f], lab[folds == f]) for f in range(N_FOLDS)]))
    summary = dict(n_features_lgb=len(features), n_input_dae=int(X_all.shape[1]), n_ep_mlp=n_ep,
                   best_eps=[int(e) for e in best_eps], test_flagged=int(test_label.sum()),
                   dae_seconds=round(time.time() - t0), oof=rows)
    (RUN / "summary.json").write_text(json.dumps(summary, indent=1))
    log(json.dumps(summary, indent=1))

    meta = dict(
        model_version=VERSION, threshold=None, params=dict(lightgbm=LGB_PARAMS, dae=DAE, head=HEAD),
        n_features=len(features), n_train=len(tr),
        input_sha256={p: sha256(DATA / p) for p in ["train.csv", "test.csv", "sample_submission.csv"]},
        model_sha256=sha256(OUT / "lgbm.txt", OUT / "dae_mlp.npz"),
        versions={p: version(p) for p in ["lightgbm", "torch", "numpy", "pandas", "scikit-learn"]},
    )
    (OUT / "model_meta.json").write_text(json.dumps(meta, indent=2))
    log("training done; run with --finalize next")


def nice_threshold(p: np.ndarray, labels: np.ndarray) -> float:
    """The shortest decimal between the lowest flagged and the highest unflagged probability."""
    lo, hi = p[labels == 0].max(), p[labels == 1].min()
    for d in range(2, 10):
        t = math.ceil(lo * 10 ** d + 1e-9) / 10 ** d
        if lo < t <= hi:
            return t
    return float((lo + hi) / 2)


def finalize() -> None:
    from app.model import Model

    m = Model()
    test = pd.read_csv(DATA / "test.csv")
    p = m.predict_proba(test)
    labels = plugin_labels(p)
    threshold = nice_threshold(p, labels)
    assert ((p >= threshold).astype(int) == labels).all()
    meta = json.loads((OUT / "model_meta.json").read_text())
    meta["threshold"] = threshold
    (OUT / "model_meta.json").write_text(json.dumps(meta, indent=2))
    pd.DataFrame({"id": test.id, "probability": p, "at_risk": labels}).to_csv(RUN / "labels.csv", index=False)
    lo, hi = p[labels == 0].max(), p[labels == 1].min()
    log(json.dumps(dict(threshold=threshold, flagged=int(labels.sum()), gap=[float(lo), float(hi)]), indent=1))


if __name__ == "__main__":
    finalize() if "--finalize" in sys.argv else train()
