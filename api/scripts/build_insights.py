"""Build api/artifacts/insights.json: per-module course design insights from training data and out-of-fold labels of the final model.

Run from api/: uv run python scripts/build_insights.py
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import f1_score, roc_auc_score

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from app import rules  # noqa: E402
from app.pipeline.features import WEEKS, normalize, placeholder_activity  # noqa: E402

DATA = ROOT.parent / "data"

# Recommendation cutoffs are proposals awaiting owner confirmation (TODO DEC-05).
LOW_AUC, HIGH_UNCERTAIN, HIGH_BASE_RISK = 0.75, 0.40, 0.58


def id_num(x: float, digits: int = 2) -> str:
    """Indonesian decimal comma, matching the frontend formatting."""
    return f"{x:.{digits}f}".replace(".", ",")


def recommendations(s: dict) -> list[dict]:
    out = []
    if s["graded_share"] == 0:
        out.append(dict(code="no_graded_by_week4", text=(
            "Belum ada asesmen yang dinilai sampai minggu 4, sehingga deteksi dini hanya bergantung pada "
            "aktivitas LMS. Tambahkan asesmen berbobot rendah sebelum minggu 3.")))
    if s["constant_submission_data"]:
        out.append(dict(code="constant_submission_data", text=(
            "Kolom pengumpulan asesmen identik untuk semua mahasiswa sampai minggu 4, sehingga status "
            "pengumpulan tidak bisa membedakan mahasiswa. Jadwalkan tenggat asesmen pertama sebelum minggu 4.")))
    if s["auc"] < LOW_AUC:
        out.append(dict(code="low_separability", text=(
            f"Model paling sulit membedakan mahasiswa berisiko di modul ini (AUC {id_num(s['auc'])}). "
            "Gunakan prediksi sebagai alasan check-in ringan, bukan keputusan akhir.")))
    if s["uncertain_share"] > HIGH_UNCERTAIN:
        out.append(dict(code="high_uncertainty", text=(
            f"{s['uncertain_share']:.0%} mahasiswa berada di zona tidak pasti (probabilitas 0,25 sampai 0,55). "
            "Prioritaskan konselor untuk meninjau kelompok ini.")))
    if s["at_risk_rate"] >= HIGH_BASE_RISK:
        out.append(dict(code="high_base_risk", text=(
            f"Tingkat at-risk historis {s['at_risk_rate']:.0%}, di atas rata-rata seluruh modul. "
            "Alokasikan kapasitas konselor lebih besar untuk modul ini.")))
    return out


def main() -> None:
    train = pd.read_csv(DATA / "train.csv").sort_values("id").reset_index(drop=True)
    oof = pd.read_csv(DATA / "blend/oof.csv")  # out-of-fold blend probabilities of scripts/train.py
    assert (oof.id == train.id).all()
    d = normalize(train)
    d["y"], d["p"], d["label"] = train.at_risk, oof.oof_blend, rules.plugin_labels(oof.oof_blend.to_numpy())
    d["placeholder"] = placeholder_activity(train).to_numpy()

    modules = {}
    for mod, g in d.groupby("code_module"):
        active = g[~g.placeholder]
        weekly = {("at_risk" if k else "not_at_risk"): [float(v) for v in a[WEEKS].median()]
                  for k, a in active.groupby("y")}
        s = dict(
            n=int(len(g)), at_risk_rate=float(g.y.mean()),
            auc=float(roc_auc_score(g.y, g.p)), f1=float(f1_score(g.y, g.label)),
            uncertain_share=float(rules.uncertain(g.p).mean()),
            graded_share=float(g.has_score.mean()),
            assessments_due_mean=float(g.assessments_due_total.mean()),
            placeholder_share=float(g.placeholder.mean()),
            no_submission_share=float(g.no_submission_by_cutoff.mean()),
            constant_submission_data=bool(
                g[["assessment_completion_rate", "no_submission_by_cutoff", "has_score"]].nunique().eq(1).all()),
            weekly_median_interactions=weekly,
            presentations={pr: dict(n=int(len(h)), at_risk_rate=float(h.y.mean()))
                           for pr, h in g.groupby("code_presentation")},
        )
        s["recommendations"] = recommendations(s)
        modules[mod] = s

    out = dict(
        source="train.csv (26.086 baris) dan label plug-in dari probabilitas out-of-fold model final (5 fold)",
        overall=dict(at_risk_rate=float(d.y.mean()), uncertain_share=float(rules.uncertain(d.p).mean())),
        cutoffs=dict(low_auc=LOW_AUC, high_uncertain=HIGH_UNCERTAIN, high_base_risk=HIGH_BASE_RISK),
        modules=modules,
    )
    (ROOT / "artifacts/insights.json").write_text(json.dumps(out, indent=2, ensure_ascii=False))

    # Targets for the week4_median lever in app/scenarios.py: not-at-risk students with a real activity block.
    safe = d[~d.placeholder & d.y.eq(0)]
    cohort = safe.code_module + "_" + safe.code_presentation
    reference = dict(
        week4_median_not_at_risk={k: float(v) for k, v in safe.week4_interactions.groupby(cohort).median().items()},
        global_week4_median_not_at_risk=float(safe.week4_interactions.median()))
    (ROOT / "artifacts/scenario_reference.json").write_text(json.dumps(reference, indent=2))
    for mod, s in modules.items():
        print(mod, s["n"], f"risk={s['at_risk_rate']:.3f} auc={s['auc']:.3f} unc={s['uncertain_share']:.3f} "
              f"graded={s['graded_share']:.2f}", [r["code"] for r in s["recommendations"]])


if __name__ == "__main__":
    main()
