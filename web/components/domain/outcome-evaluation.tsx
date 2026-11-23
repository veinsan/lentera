import { CalibrationChart } from "@/components/charts/calibration-chart";
import { ReachCheckChart } from "@/components/charts/reach-check-chart";
import { FairnessTable } from "@/components/domain/fairness-table";
import { ImpactPanel } from "@/components/domain/impact-panel";
import { Section } from "@/components/domain/section";
import { Stat } from "@/components/domain/stat";
import { TierBadge } from "@/components/domain/tier-badge";
import { DataTable } from "@/components/ui/data-table";
import type { OutcomeReport, Tier } from "@/lib/api";
import { fmtInt, fmtModule, fmtNum, fmtPct } from "@/lib/format";
import { ARCHETYPE_LABELS } from "@/lib/labels";

const TIER_ORDER: Tier[] = ["critical", "high", "watch", "low"];

/** Predictions checked against real outcomes. Aggregates only: no student's outcome is shown. */
export function OutcomeEvaluation({ report }: { report: OutcomeReport }) {
  const { metrics: m, coverage, plan } = report;
  const partial = coverage.without_label > 0 || coverage.unknown_ids > 0;
  const contacted = report.impact?.contacted.n ?? 0;
  return (
    <div className="flex flex-col gap-5">
      {report.impact && <ImpactPanel impact={report.impact} />}

      {contacted > 0 && (
        <p className="plate px-5 py-4 text-sm leading-relaxed text-ink-2">
          Angka akurasi di bawah mencampur efek kontak. Mahasiswa yang berhasil dibantu tidak lagi gagal, sehingga presisi model terlihat lebih rendah
          daripada saat tidak ada intervensi.
        </p>
      )}

      <section className="plate grid grid-cols-2 gap-x-6 gap-y-7 p-5 sm:grid-cols-3 sm:p-6 2xl:grid-cols-5" aria-label="Ringkasan hasil akhir">
        <Stat label="F1" value={m.f1} format="dec4" tone="blue" size="lg" note={`${fmtInt(m.n)} mahasiswa`} />
        <Stat label="Presisi" value={m.precision} format="dec4" note={`${fmtInt(m.tp)} dari ${fmtInt(m.tp + m.fp)} yang ter-flag`} />
        <Stat label="Recall" value={m.recall} format="dec4" note={`${fmtInt(m.tp)} dari ${fmtInt(m.tp + m.fn)} yang berisiko`} />
        <Stat label="AUC" value={m.auc} format="dec4" note={`at-risk aktual ${fmtPct(m.base_rate, 1)}`} />
        <Stat label="Kalibrasi (ECE)" value={report.calibration.ece} format="dec4" note={`Brier ${fmtNum(report.calibration.brier, 3)}`} />
      </section>

      {partial && (
        <p className="plate px-5 py-4 text-sm text-ink-2">
          Sebanyak {fmtInt(coverage.matched)} dari {fmtInt(coverage.cohort)} mahasiswa kohort punya status akhir. Mahasiswa tanpa status akhir tidak ikut
          dihitung{coverage.unknown_ids > 0 && <>, dan {fmtInt(coverage.unknown_ids)} id di file tidak ada di kohort ini</>}.
        </p>
      )}

      {plan && (
        <Section title="Rencana kontak dicek dengan hasil akhir" description="Planner membagi jam konselor memakai probabilitas terkalibrasi. Di sini perkiraannya dibandingkan dengan hasil sebenarnya.">
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-3">
            <Stat label="Ditelepon konselor" value={plan.contacted} note={`${fmtInt(plan.advisors)} konselor, ${fmtNum(plan.hours_per_advisor, 0)} jam per minggu`} />
            <Stat label="Perkiraan berisiko" value={plan.expected_at_risk} note="jumlah probabilitas terkalibrasi" />
            <Stat label="Benar-benar berisiko" value={plan.at_risk} tone="blue" note={`${fmtPct(plan.contacted ? plan.at_risk / plan.contacted : null, 1)} dari yang ditelepon`} />
          </div>
        </Section>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Section title="Kalibrasi pada hasil akhir" description="Titik dekat garis diagonal berarti probabilitas yang diberikan model sama dengan kejadian sebenarnya.">
          <CalibrationChart bins={report.calibration.bins} />
        </Section>
        <Section title="Jangkauan saat kapasitas terbatas" description="Jumlah mahasiswa berisiko yang terjangkau bila konselor menghubungi dari probabilitas tertinggi, perkiraan dibanding kenyataan.">
          <ReachCheckChart points={report.capacity} />
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Section title="Tier risiko" description="Rata-rata probabilitas tiap tier dibanding tingkat at-risk sebenarnya.">
          <DataTable
            label="Tier risiko pada hasil akhir"
            rows={TIER_ORDER.map((t) => ({ t, ...report.tiers[t] }))}
            rowId={(r) => r.t}
            columns={[
              { id: "t", label: "Tier", rowHeader: true, cell: (r) => <TierBadge tier={r.t} /> },
              { id: "n", label: "Mahasiswa", align: "end", cell: (r) => fmtInt(r.n) },
              { id: "p", label: "Rata-rata probabilitas", align: "end", cell: (r) => fmtPct(r.mean_probability, 1) },
              { id: "a", label: "At-risk aktual", align: "end", cell: (r) => <span className="font-semibold">{fmtPct(r.at_risk_rate, 1)}</span> },
              { id: "s", label: "Porsi dari semua at-risk", align: "end", cell: (r) => fmtPct(r.share_of_at_risk, 1) },
            ]}
          />
        </Section>
        <Section title="Archetype" description="Archetype menentukan tindakan. Tingkat at-risk aktual menunjukkan apakah kelompoknya memang berbeda.">
          <DataTable
            label="Archetype pada hasil akhir"
            rows={Object.entries(report.archetypes)
              .filter(([, a]) => a.n > 0)
              .map(([key, a]) => ({ key, ...a }))}
            rowId={(r) => r.key}
            columns={[
              { id: "a", label: "Archetype", rowHeader: true, cell: (r) => ARCHETYPE_LABELS[r.key] ?? r.key },
              { id: "n", label: "Mahasiswa", align: "end", cell: (r) => fmtInt(r.n) },
              { id: "f", label: "Ter-flag", align: "end", cell: (r) => fmtInt(r.flagged) },
              { id: "p", label: "Rata-rata probabilitas", align: "end", cell: (r) => fmtPct(r.mean_probability, 1) },
              { id: "r", label: "At-risk aktual", align: "end", cell: (r) => <span className="font-semibold">{fmtPct(r.at_risk_rate, 1)}</span> },
            ]}
          />
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Section title="Per modul" description="Kualitas flag di tiap modul pada ambang yang dipakai aplikasi.">
          <DataTable
            label="Hasil akhir per modul"
            dense
            rows={Object.entries(report.modules).map(([mod, r]) => ({ mod, ...r }))}
            rowId={(r) => r.mod}
            columns={[
              { id: "m", label: "Modul", rowHeader: true, cell: (r) => fmtModule(r.mod) },
              { id: "n", label: "n", align: "end", cell: (r) => fmtInt(r.n) },
              { id: "b", label: "At-risk aktual", align: "end", cell: (r) => fmtPct(r.base_rate, 1) },
              { id: "p", label: "Presisi", align: "end", cell: (r) => fmtNum(r.precision, 3) },
              { id: "r", label: "Recall", align: "end", cell: (r) => fmtNum(r.recall, 3) },
              { id: "f1", label: "F1", align: "end", cell: (r) => <span className="font-semibold">{fmtNum(r.f1, 3)}</span> },
            ]}
          />
        </Section>
        <Section title="Matriks konfusi" description={`Ambang ter-flag adalah probabilitas ${fmtPct(report.threshold, 1)}.`}>
          <DataTable
            label="Matriks konfusi"
            rows={[
              { id: "flag", label: "Ter-flag", yes: m.tp, no: m.fp },
              { id: "noflag", label: "Tidak ter-flag", yes: m.fn, no: m.tn },
            ]}
            rowId={(r) => r.id}
            columns={[
              { id: "l", label: "Prediksi", rowHeader: true, cell: (r) => r.label },
              { id: "y", label: "Benar-benar berisiko", align: "end", cell: (r) => <span className="font-semibold">{fmtInt(r.yes)}</span> },
              { id: "n", label: "Tidak berisiko", align: "end", cell: (r) => fmtInt(r.no) },
            ]}
          />
          <p className="mt-4 text-sm text-ink-3">Akurasi {fmtPct(m.accuracy, 1)}.</p>
        </Section>
      </div>

      {report.fairness && (
        <Section title="Fairness pada hasil akhir" description="Kualitas flag per kelompok demografi. Fitur demografi tidak pernah dipakai sebagai alasan intervensi.">
          <FairnessTable fairness={report.fairness} />
        </Section>
      )}
    </div>
  );
}
