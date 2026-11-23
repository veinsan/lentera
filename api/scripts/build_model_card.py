"""Build api/artifacts/model_card.json for the DSCO final model from its training run and the committed model.

Run from api/ after scripts/train.py and --finalize: uv run python scripts/build_model_card.py [path/to/dsco]
Every number in the model card page comes from this file. Evaluation uses the training run's out-of-fold
probabilities (data/blend/oof.csv: 5 folds, seed 42) with labels from the notebook's expected-F1 plug-in rule.
"""
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import f1_score, log_loss, precision_score, recall_score, roc_auc_score

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from app import rules  # noqa: E402
from app.explain import LABELS, SIGNALS, Explainer  # noqa: E402
from app.model import Model  # noqa: E402
from app.pipeline.features import normalize, placeholder_activity  # noqa: E402

DATA = ROOT.parent / "data"
RUN = DATA / "blend"
DSCO = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parents[1] / "dsco"
SELECTED_REF = 57470830  # the team's selected Kaggle submission of this notebook, sub_v5.csv (owner, 2026-11-23)

COMPONENTS = [
    ("oof_lgb", "LightGBM", "pembanding", "Komponen pohon dari blend."),
    ("oof_mlp", "DAE-MLP", "pembanding",
     "Komponen neural dari blend; epoch-nya dipilih per fold dari log loss validasi, jadi OOF-nya sedikit optimistis."),
    ("oof_blend", "Blend LightGBM + DAE-MLP", "dipilih", "Model final notebook DSCO: rata-rata logit kedua komponen."),
]


def binary(y, p, label):
    return dict(n=int(len(y)), base_rate=float(np.mean(y)), flag_rate=float(np.mean(label)),
                precision=float(precision_score(y, label, zero_division=0)),
                recall=float(recall_score(y, label, zero_division=0)),
                f1=float(f1_score(y, label, zero_division=0)),
                auc=float(roc_auc_score(y, p)) if len(np.unique(y)) > 1 else None)


def segment(y, p, label):
    b = binary(y, p, label)
    return dict(f1=b["f1"], precision=b["precision"], recall=b["recall"], auc=b["auc"], n=b["n"],
                positive_rate=b["base_rate"])


def main() -> None:
    m = Model()
    train = pd.read_csv(DATA / "train.csv").sort_values("id").reset_index(drop=True)
    oof = pd.read_csv(RUN / "oof.csv")
    assert (oof.id.to_numpy() == train.id.to_numpy()).all()
    y, folds = train.at_risk.to_numpy(), oof.fold.to_numpy()
    p = oof.oof_blend.to_numpy()
    label = rules.plugin_labels(p)

    d = normalize(train)
    placeholder = placeholder_activity(train).to_numpy()
    masks = dict(all=np.ones(len(y), bool), active=~placeholder,
                 hard=~placeholder & train.no_submission_by_cutoff.eq(0).to_numpy(),
                 m07=d.code_module.eq("m07").to_numpy(), no_activity=placeholder)

    per_fold = [dict(fold=f, **{k: binary(y[folds == f], p[folds == f], label[folds == f])[k]
                                for k in ["f1", "precision", "recall", "auc"]}) for f in range(folds.max() + 1)]
    fold_f1 = [r["f1"] for r in per_fold]
    cv = dict(per_fold=per_fold, oof_f1=float(f1_score(y, label)), mean_f1=float(np.mean(fold_f1)),
              sd_f1=float(np.std(fold_f1, ddof=1)))

    comparison = []
    for column, name, decision, reason in COMPONENTS:
        q = oof[column].to_numpy()
        lab = rules.plugin_labels(q)
        f1s = [f1_score(y[folds == f], lab[folds == f]) for f in range(folds.max() + 1)]
        comparison.append(dict(method=name, seeds=1, folds=len(f1s), f1=float(f1_score(y, lab)),
                               f1_sd=float(np.std(f1s, ddof=1)), auc=float(roc_auc_score(y, q)),
                               logloss=float(log_loss(y, q)),
                               hard_f1=float(f1_score(y[masks["hard"]], lab[masks["hard"]])),
                               m07_f1=float(f1_score(y[masks["m07"]], lab[masks["m07"]])),
                               decision=decision, reason=reason))

    bins = pd.cut(p, np.linspace(0, 1, 11), include_lowest=True)
    cal = pd.DataFrame(dict(y=y, p=p, b=bins)).groupby("b", observed=True).agg(n=("y", "size"), predicted=("p", "mean"),
                                                                              observed=("y", "mean"))
    calibration = dict(
        bins=[dict(lower=float(i.left), upper=float(i.right), **{k: float(v) for k, v in r.items()})
              for i, r in cal.iterrows()],
        ece=float((cal.n * (cal.predicted - cal.observed).abs()).sum() / cal.n.sum()),
        brier=float(np.mean((p - y) ** 2)))

    order = np.argsort(-p)
    capacity = [dict(share=k / 100, n=int(len(p) * k / 100),
                     precision=float(y[order[:int(len(p) * k / 100)]].mean()),
                     recall=float(y[order[:int(len(p) * k / 100)]].sum() / y.sum()),
                     expected_at_risk=float(p[order[:int(len(p) * k / 100)]].sum()))
                for k in range(5, 101, 5)]

    per_module = {mod: binary(y[ix], p[ix], label[ix]) for mod, ix in d.groupby("code_module").indices.items()}
    fairness = {col: {str(level): binary(y[ix], p[ix], label[ix]) for level, ix in d.groupby(col).indices.items()}
                for col in ["gender", "disability", "age_band", "imd_band", "highest_education"]}

    tiers, arch = rules.tier(p), rules.archetype(train)
    tier_stats = {t: dict(n=int((tiers == t).sum()), at_risk_rate=float(y[tiers == t].mean()),
                          share_of_at_risk=float(y[tiers == t].sum() / y.sum()))
                  for _, t in rules.TIERS}
    arch_stats = {a: dict(n=int((arch == a).sum()), at_risk_rate=float(y[arch == a].mean()),
                          mean_probability=float(p[arch == a].mean()))
                  for a in rules.ARCHETYPES}

    # Mean |SHAP| of the LightGBM half on the demo cohort, summed per signal, as a share of the total.
    test = pd.read_csv(DATA / "test.csv")
    X = m.frame(test)
    e = Explainer(m)
    values = e.shap(X)
    by_signal = e.signal_shap(np.abs(values), X).mean()
    by_signal = 100 * by_signal / by_signal.sum()
    top = pd.Series(np.abs(values[:, :-1]).mean(axis=0), index=m.features).sort_values(ascending=False).head(15)

    kaggle = pd.read_csv(ROOT / "artifacts/kaggle_submissions.csv").set_index("ref")
    selected = kaggle.loc[SELECTED_REF]
    sub_v5 = DSCO / "sub_v5.csv"
    run_labels = pd.read_csv(RUN / "labels.csv").set_index("id")
    matches = None
    if sub_v5.exists():
        ref = pd.read_csv(sub_v5).set_index("id").loc[run_labels.index]
        matches = int((ref.at_risk.to_numpy() == run_labels.at_risk.to_numpy()).sum())
    leaderboard = dict(
        public_f1=float(selected.publicScore), private_f1=float(selected.privateScore), submission_ref=SELECTED_REF,
        submission_sha256=hashlib.sha256(sub_v5.read_bytes().replace(b"\r\n", b"\n")).hexdigest()
        if sub_v5.exists() else None,
        submitted_utc=selected.date,
        selected=dict(ref=SELECTED_REF, file=selected.fileName, submitted_utc=selected.date,
                      public_f1=float(selected.publicScore), private_f1=float(selected.privateScore)),
        # The notebook ran on a Kaggle GPU; this CPU retrain of it agrees with that submission on these test rows.
        retrain_label_matches=matches, rows=int(len(run_labels)))

    card = dict(
        model=m.meta,
        protocol=dict(
            outer="StratifiedKFold 5-fold, strata module x target, seed 42",
            inner="ambang plug-in expected F1 dari probabilitas out-of-fold, tanpa label",
            seeds=[42],
            early_stopping="LightGBM 1.405 tree tanpa early stopping; epoch head DAE-MLP dipilih per fold dari log loss validasi",
            inference=("LightGBM dan DAE-MLP dilatih pada seluruh 26.086 baris train; autoencoder dilatih tanpa label "
                       "pada train dan test, lalu logit kedua model dirata-rata")),
        cv=cv,
        segments_seed42={k: segment(y[mk], p[mk], label[mk]) for k, mk in masks.items()},
        comparison=comparison,
        leaderboard=leaderboard,
        calibration=calibration,
        capacity_curve=capacity,
        per_module=per_module,
        fairness=fairness,
        tiers=tier_stats,
        archetypes=arch_stats,
        importance=dict(by_signal={s: dict(label=LABELS[s], group=SIGNALS[s][0], value=float(v))
                                   for s, v in by_signal.items()},
                        top_features={k: float(v) for k, v in top.items()}),
        evaluation_notes=dict(
            calibration_and_tiers=("Probabilitas out-of-fold blend (5 fold, seed 42) dengan ambang yang dipakai aplikasi; "
                                   "skor kalibrasi, bukan evaluasi independen."),
            per_module_and_fairness="Label plug-in expected F1 dari probabilitas out-of-fold blend."),
    )
    (ROOT / "artifacts/model_card.json").write_text(json.dumps(card, indent=2, ensure_ascii=False))
    print(json.dumps(dict(cv={k: v for k, v in cv.items() if k != "per_fold"}, ece=calibration["ece"],
                          brier=calibration["brier"], comparison=[(c["method"], round(c["f1"], 4), round(c["auc"], 4))
                                                                   for c in comparison],
                          retrain_vs_sub_v5=matches, tiers=tier_stats), indent=2))


if __name__ == "__main__":
    main()
