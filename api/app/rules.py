"""Decision rules from docs/PRD.md sections 5 and 5.1. Pure functions over raw rows in the DSCO test.csv schema."""
from __future__ import annotations

import numpy as np
import pandas as pd

from app.pipeline.features import placeholder_activity

THRESHOLD = 0.387  # plugin_labels on the DSCO test cohort (scripts/train.py --finalize): 3,759 of 6,502 flagged
# Tier cutoffs above the threshold and the uncertain band are proposals awaiting owner confirmation (TODO DEC-05).
TIERS = [(0.85, "critical"), (0.6, "high"), (THRESHOLD, "watch"), (0.0, "low")]
UNCERTAIN = (0.25, 0.55)
LOW_SCORE = 60

ARCHETYPES = ["silent", "no_lms_record", "missed_submission", "low_score", "fading", "engaged"]

# Cost scenario defaults for the planner (rupiah per semester). Assumptions, not data: users override them per plan,
# and the interface labels every number built from them as a scenario.
ECONOMICS = dict(cost_per_student=350_000, tuition=7_500_000, success_rate=0.2)

# Minutes and effectiveness are planner defaults; users override them per plan.
PLAYBOOK = {
    "silent": dict(
        action="admin_check", label="Cek administrasi", minutes=10, effectiveness=1.0,
        description="Konfirmasi status registrasi dan akses, lalu telepon mahasiswa.",
        template=("Halo, kami dari tim layanan akademik. Kami belum melihat aktivitas Anda di course "
                  "{module} sejak awal perkuliahan. Apakah ada kendala akses atau registrasi yang bisa kami bantu?")),
    "no_lms_record": dict(
        action="access_check", label="Cek akses LMS", minutes=5, effectiveness=1.0,
        description="Pastikan akun LMS mahasiswa aktif dan data aktivitasnya terekam.",
        template=("Halo, kami ingin memastikan akun LMS Anda untuk course {module} berfungsi normal. "
                  "Apakah Anda bisa masuk dan membuka materi minggu ini?")),
    "missed_submission": dict(
        action="deadline_call", label="Telepon dan rencana tugas", minutes=15, effectiveness=1.0,
        description="Telepon mahasiswa, susun rencana pengumpulan, dan rujuk ke klinik tugas.",
        template=("Halo, kami melihat ada {missed} asesmen di course {module} yang belum terkumpul. "
                  "Kami ingin membantu menyusun rencana pengumpulan. Kapan waktu yang cocok untuk berbicara singkat?")),
    "low_score": dict(
        action="tutoring_referral", label="Rujukan tutor", minutes=10, effectiveness=1.0,
        description="Rujuk ke tutor sebaya dan undang ke office hours.",
        template=("Halo, nilai awal Anda di course {module} menunjukkan beberapa materi mungkin perlu "
                  "diperkuat. Kami bisa menghubungkan Anda dengan tutor sebaya dan jadwal office hours.")),
    "fading": dict(
        action="auto_nudge", label="Nudge otomatis", minutes=0, effectiveness=1.0,
        description="Pesan otomatis yang dipersonalisasi. Naikkan ke telepon jika aktivitas terus turun.",
        template=("Halo, aktivitas Anda di course {module} turun dibanding minggu pertama. Terakhir aktif "
                  "hari ke-{last_day}. Materi minggu ini sudah tersedia, semangat melanjutkan!")),
    "engaged": dict(
        action="auto_checkin", label="Check-in otomatis", minutes=0, effectiveness=1.0,
        description="Pesan check-in otomatis. Konselor meninjau jika mahasiswa ter-flag.",
        template=("Halo, bagaimana perkuliahan course {module} sejauh ini? Jika ada yang ingin "
                  "didiskusikan, tim layanan akademik siap membantu.")),
}


def tier(p: np.ndarray | pd.Series) -> np.ndarray:
    p = np.asarray(p, dtype=float)
    return np.select([p >= cut for cut, _ in TIERS], [name for _, name in TIERS], "low")


def plugin_labels(prob: np.ndarray) -> np.ndarray:
    """The notebook's expected-F1 plug-in rule: flag the top k, k maximizing the expected F1 of calibrated probabilities.

    It needs no labels. THRESHOLD is this rule applied once to the DSCO test cohort (scripts/train.py --finalize).
    """
    prob = np.asarray(prob, dtype=float)
    order = np.argsort(-prob)
    expected_f1 = 2 * np.cumsum(prob[order]) / (np.arange(1, len(prob) + 1) + prob.sum())
    labels = np.zeros(len(prob), dtype=int)
    labels[order[:int(expected_f1.argmax()) + 1]] = 1
    return labels


def uncertain(p: np.ndarray | pd.Series) -> np.ndarray:
    p = np.asarray(p, dtype=float)
    return (p > UNCERTAIN[0]) & (p < UNCERTAIN[1])


def archetype(df: pd.DataFrame) -> np.ndarray:
    """One archetype per raw row, checked in PRD order."""
    placeholder = placeholder_activity(df).to_numpy()
    no_sub = df.no_submission_by_cutoff.eq(1).to_numpy()
    low = (df.has_score.eq(1) & (df.avg_score < LOW_SCORE)).to_numpy()
    fading = (df.week4_interactions < 0.5 * df.week1_interactions).to_numpy()
    return np.select([placeholder & no_sub, placeholder, no_sub, low, fading], ARCHETYPES[:5], ARCHETYPES[5])


def message(arch: str, row: pd.Series) -> str:
    missed = row.assessments_due_total * (1 - row.assessment_completion_rate)
    return PLAYBOOK[arch]["template"].format(
        module=str(row.code_module).upper().replace("GGG", "M07"),
        missed=int(round(missed)), last_day=int(row.last_activity_day))
