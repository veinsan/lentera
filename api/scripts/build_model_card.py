"""Build api/artifacts/model_card.json from the DSCO evaluation outputs and the committed model.

Run from api/: uv run python scripts/build_model_card.py [path/to/dsco]
Every number in the model card page comes from this file.
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import f1_score, precision_score, recall_score, roc_auc_score

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from app import rules  # noqa: E402
from app.explain import SIGNALS, LABELS  # noqa: E402
from app.model import Model  # noqa: E402
from app.pipeline.features import normalize  # noqa: E402

DATA = ROOT.parent / "data"
DSCO = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parents[1] / "dsco"
EXP = DSCO / "outputs/experiments"
SEEDS = [42, 137, 20261031]
SELECTED_REF = 57470830  # the submission the team selected for the final Kaggle leaderboard (owner, 2026-11-23)

# Decisions recorded in dsco/docs/findings.md and dsco/docs/experiment_log.md.
DECISIONS = {
    "cat_clean_rank": ("dipilih", "Gain clean+rank konsisten pada tiga seed dengan budget 500 trees yang sama."),
    "route_m07": ("ditolak", "Gain rata-rata hanya 0,000177 terhadap satu CatBoost; tidak membenarkan model kedua."),
    "blend_rank": ("ditolak", "Rata-rata LightGBM+CatBoost tidak unggul konsisten; F1 M07 turun 0,0071 pada seed 137."),
    "pooled_rank_c1": ("ditolak", "Kalibrasi intercept module/cohort menurunkan F1 M07 0,015 sampai 0,018 pada seed 137."),
    "pooled_rank_c01": ("ditolak", "Kalibrasi intercept module/cohort menurunkan F1 M07 0,015 sampai 0,018 pada seed 137."),
    "cat_motif_rank": ("ditolak", "Fitur motif empat minggu tidak konsisten menaikkan F1."),
    "lgb_expert_motif_rank": ("ditolak", "Expert segmen sulit tidak memberi gain konsisten; F1 M07 turun pada seed kedua."),
    "mlp_motif_rank": ("ditolak", "Screening satu seed F1 0,762558, di bawah baseline; tidak dituning lanjut."),
}


def binary(y, p, label):
    return dict(n=int(len(y)), base_rate=float(np.mean(y)), flag_rate=float(np.mean(label)),
                precision=float(precision_score(y, label, zero_division=0)),
                recall=float(recall_score(y, label, zero_division=0)),
                f1=float(f1_score(y, label, zero_division=0)),
                auc=float(roc_auc_score(y, p)) if len(np.unique(y)) > 1 else None)


def main() -> None:
    m = Model()
    train = pd.read_csv(DATA / "train.csv")
    summaries = {s: json.loads((EXP / f"cat_clean_rank_{s}/summary.json").read_text()) for s in SEEDS}
    nested = pd.read_csv(EXP / "cat_clean_rank_42/oof.csv")
    final = pd.read_csv(DSCO / "outputs/final/oof_probabilities.csv")
    assert (nested.id == train.id).all() and (final.id == train.id).all()
    assert np.allclose(nested.probability, final.probability)
    y, p, label = train.at_risk.to_numpy(), final.probability.to_numpy(), nested.prediction.to_numpy()

    f1s = [summaries[s]["segments"]["all"]["f1"] for s in SEEDS]
    per_seed = [dict(seed=s, **{k: summaries[s]["segments"]["all"][k] for k in ["f1", "precision", "recall", "auc"]})
                for s in SEEDS]

    metrics = pd.read_csv(DSCO / "outputs/eda/17_compare_results/metrics.csv")
    comparison = [dict(method=r.method, seeds=int(r.n), f1=r.f1, f1_sd=r.f1_std, auc=r.auc, hard_f1=r.hard_f1,
                       m07_f1=r.m07_f1, decision=DECISIONS.get(r.method, ("pembanding", None))[0],
                       reason=DECISIONS.get(r.method, (None, None))[1])
                  for r in pd.read_csv(DSCO / "outputs/eda/21_presentation/ablation.csv").itertuples()]
    ablation = []
    for name, label_id in [("cat_raw", "Raw, kategori dinormalisasi"), ("cat_clean", "Clean + fitur deterministik"),
                           ("cat_clean_rank", "Clean + rank fold-local"), ("cat_motif_rank", "+ motif empat minggu")]:
        row = metrics[metrics.name.isin([f"{name}_42", f"{name}_137"])].set_index("seed").all_f1
        ablation.append(dict(name=name, label=label_id, f1_seed42=float(row[42]), f1_seed137=float(row[137])))

    ledger = json.loads((DSCO / "outputs/submissions/ledger.json").read_text())[0]
    # Scores as Kaggle reports them after the deadline (kaggle competitions submissions -v > artifacts/kaggle_submissions.csv).
    kaggle = pd.read_csv(ROOT / "artifacts/kaggle_submissions.csv").set_index("ref")
    deployed, selected = kaggle.loc[ledger["ref"]], kaggle.loc[SELECTED_REF]
    stress =json.loads((DSCO / "outputs/eda/18_presentation_stress/cat_clean_rank/summary.json").read_text())

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

    d = normalize(train)
    segments_42 = summaries[42]["segments"]
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

    imp = pd.Series(m.cbm.get_feature_importance(), index=m.state.columns)
    by_signal = {s: float(imp[fs].sum()) for s, (_, fs) in SIGNALS.items()}

    card = dict(
        model=m.meta,
        protocol=dict(
            outer="StratifiedGroupKFold 5-fold, strata module x presentation x target, baris duplikat dikelompokkan",
            inner="3-fold di dalam setiap outer train untuk memilih threshold",
            seeds=SEEDS, early_stopping="tidak ada pada outer validation",
            inference="satu CatBoost dilatih pada seluruh 26.086 baris train, seed 42"),
        nested=dict(per_seed=per_seed, mean_f1=float(np.mean(f1s)), sd_f1=float(np.std(f1s))),
        segments_seed42={k: segments_42[k] for k in ["all", "active", "hard", "m07", "no_activity"]},
        comparison=comparison,
        ablation=ablation,
        leaderboard=dict(public_f1=float(deployed.publicScore), private_f1=float(deployed.privateScore),
                         submission_ref=ledger["ref"], submission_sha256=ledger["submission_sha256"],
                         submitted_utc=ledger["date_utc"],
                         selected=dict(ref=SELECTED_REF, file=selected.fileName, submitted_utc=selected.date,
                                       public_f1=float(selected.publicScore), private_f1=float(selected.privateScore))),
        presentation_stress=dict(note="Satu presentation di-hold-out per run; menguji transfer ke cohort baru.",
                                 per_presentation=stress["per_presentation"]),
        calibration=calibration,
        capacity_curve=capacity,
        per_module=per_module,
        fairness=fairness,
        tiers=tier_stats,
        archetypes=arch_stats,
        importance=dict(by_signal={s: dict(label=LABELS[s], group=SIGNALS[s][0], value=v) for s, v in by_signal.items()},
                        top_features=imp.sort_values(ascending=False).head(15).to_dict()),
        evaluation_notes=dict(
            calibration_and_tiers="Probabilitas OOF seed 42 dengan threshold tetap 0,375; skor kalibrasi, bukan evaluasi independen.",
            per_module_and_fairness="Label nested seed 42 (threshold dari inner fold)."),
    )
    (ROOT / "artifacts/model_card.json").write_text(json.dumps(card, indent=2, ensure_ascii=False))
    print(json.dumps(dict(mean_f1=card["nested"]["mean_f1"], sd=card["nested"]["sd_f1"], ece=calibration["ece"],
                          leaderboard=card["leaderboard"],
                          top10=capacity[1], tiers=tier_stats), indent=2))


if __name__ == "__main__":
    main()
