import type { Metadata } from "next";
import { Suspense } from "react";
import { CalibrationChart } from "@/components/charts/calibration-chart";
import { CapacityChart } from "@/components/charts/capacity-chart";
import { ImportanceChart } from "@/components/charts/importance-chart";
import { ApiError } from "@/components/domain/api-error";
import { FairnessTable } from "@/components/domain/fairness-table";
import { KaggleScores } from "@/components/domain/kaggle-scores";
import { ModelTabs } from "@/components/domain/model-tabs";
import { DriftPanel, RequestPanel } from "@/components/domain/monitoring";
import { Section } from "@/components/domain/section";
import { Stat } from "@/components/domain/stat";
import { TierBadge } from "@/components/domain/tier-badge";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { getModelCard, type ModelCard, type Tier } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { fmtInt, fmtModule, fmtNum, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Model & monitoring" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Peluang dari model ini terkalibrasi dan stabil antar-fold, jadi bisa dipakai untuk membagi jam konselor."
        description="Cara model dibangun dan divalidasi, seberapa jauh prediksinya bisa dipercaya, dan apakah kohort ini masih mirip data latihnya."
      />
      <Suspense fallback={<div className="plate h-48 animate-pulse" aria-label="Memuat model card" />}>
        <ModelContent />
      </Suspense>
    </>
  );
}

// M07 is listed with the other modules below, so it is not repeated as a segment.
const SEGMENTS: Partial<Record<keyof ModelCard["segments_seed42"], string>> = {
  all: "Semua mahasiswa",
  active: "Punya catatan LMS",
  hard: "Segmen sulit (aktif, tanpa missed submission)",
  no_activity: "Tanpa catatan LMS (placeholder)",
};
const TIER_ORDER: Tier[] = ["critical", "high", "watch", "low"];
const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

async function ModelContent() {
  const user = await getCurrentUser();
  const res = await getModelCard(user.accessToken);
  if (!res.ok) return <ApiError />;
  const card = res.data;
  const { cv, leaderboard, calibration, segments_seed42: seg } = card;
  const selected = leaderboard.selected;

  const overview = (
    <div className="flex flex-col gap-5">
      <section className="plate grid grid-cols-2 gap-x-6 gap-y-7 p-5 sm:p-6 lg:grid-cols-4" aria-label="Ringkasan model">
        <Stat
          label="F1 out-of-fold"
          value={cv.oof_f1}
          format="dec4"
          tone="blue"
          size="lg"
          note={`SD antar-fold ${fmtNum(cv.sd_f1, 4)} (${cv.per_fold.length} fold)`}
        />
        <Stat label="AUC out-of-fold" value={seg.all.auc} format="dec4" note={`${fmtInt(seg.all.n)} baris train`} />
        <Stat label="Ambang ter-flag" value={card.model.threshold} format="dec4" note="plug-in expected F1, bukan 0,5" />
        <Stat label="Kalibrasi (ECE)" value={calibration.ece} format="dec4" note={`Brier ${fmtNum(calibration.brier, 3)}`} />
      </section>

      {selected && (
        <Section title="Skor Kaggle" description="F1 model final tim di leaderboard DSCO 2026.">
          <KaggleScores pub={selected.public_f1} priv={selected.private_f1} />
        </Section>
      )}

      <Section title="Validasi silang" description={`${sentence(card.protocol.inference)}.`}>
        <ul className="mb-5 space-y-1.5 text-sm leading-relaxed text-ink-2">
          <li>Fold: {card.protocol.outer}.</li>
          <li>Ambang: {card.protocol.inner}.</li>
          <li>Early stopping: {card.protocol.early_stopping}.</li>
        </ul>
        <DataTable
          label="F1 per fold"
          rows={cv.per_fold}
          rowId={(s) => s.fold}
          columns={[
            { id: "fold", label: "Fold", rowHeader: true, cell: (s) => <span className="font-mono">{s.fold + 1}</span> },
            { id: "f1", label: "F1", align: "end", cell: (s) => <span className="font-semibold">{fmtNum(s.f1, 4)}</span> },
            { id: "p", label: "Presisi", align: "end", cell: (s) => fmtNum(s.precision, 4) },
            { id: "r", label: "Recall", align: "end", cell: (s) => fmtNum(s.recall, 4) },
            { id: "auc", label: "AUC", align: "end", cell: (s) => fmtNum(s.auc, 4) },
          ]}
        />
      </Section>

      <Section title="Komponen model" description="Kedua komponen dan blend-nya dinilai pada fold yang sama, dengan aturan ambang yang sama.">
        <DataTable
          label="Komponen model"
          rows={card.comparison}
          rowId={(m) => m.method}
          columns={[
            { id: "m", label: "Metode", rowHeader: true, cell: (m) => <span className="font-medium">{m.method}</span> },
            { id: "f1", label: "F1", align: "end", cell: (m) => <span className="font-semibold">{fmtNum(m.f1, 4)}</span> },
            { id: "sd", label: "SD antar-fold", align: "end", cell: (m) => fmtNum(m.f1_sd, 4) },
            { id: "auc", label: "AUC", align: "end", cell: (m) => fmtNum(m.auc, 4) },
            { id: "hard", label: "F1 sulit", align: "end", cell: (m) => fmtNum(m.hard_f1, 4) },
            { id: "m07", label: "F1 M07", align: "end", cell: (m) => fmtNum(m.m07_f1, 4) },
            { id: "d", label: "Keputusan", cell: (m) => <DecisionBadge decision={m.decision} /> },
            { id: "why", label: "Alasan", className: "min-w-[260px] max-w-sm whitespace-normal text-[13px] text-ink-3", cell: (m) => m.reason ?? "" },
          ]}
        />
      </Section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Section
          title="Kalibrasi probabilitas"
          description="Titik dekat garis diagonal berarti probabilitas bisa dibaca apa adanya, sehingga jumlahnya menjadi perkiraan jumlah mahasiswa yang benar-benar berisiko."
        >
          <CalibrationChart bins={calibration.bins} />
        </Section>
        <Section title="Presisi saat kapasitas terbatas" description="Jika konselor hanya bisa menghubungi sebagian mahasiswa, urutan probabilitas menjaga presisi tetap tinggi.">
          <CapacityChart points={card.capacity_curve} />
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Section title="Tier risiko" description={card.evaluation_notes.calibration_and_tiers}>
          <DataTable
            label="Tier risiko"
            rows={TIER_ORDER.map((t) => ({ t, ...card.tiers[t] }))}
            rowId={(r) => r.t}
            columns={[
              { id: "t", label: "Tier", rowHeader: true, cell: (r) => <TierBadge tier={r.t} /> },
              { id: "n", label: "Mahasiswa", align: "end", cell: (r) => fmtInt(r.n) },
              { id: "a", label: "At-risk aktual", align: "end", cell: (r) => fmtPct(r.at_risk_rate, 1) },
              { id: "s", label: "Porsi dari semua at-risk", align: "end", cell: (r) => fmtPct(r.share_of_at_risk, 1) },
            ]}
          />
        </Section>
        <Section title="Keandalan per segmen dan modul" description={card.evaluation_notes.per_module_and_fairness}>
          <DataTable
            label="Keandalan per segmen dan modul"
            dense
            rows={[
              ...(Object.keys(SEGMENTS) as (keyof typeof SEGMENTS)[]).map((k) => ({ id: k, label: SEGMENTS[k]!, n: seg[k].n, f1: seg[k].f1, auc: seg[k].auc })),
              ...Object.entries(card.per_module).map(([mod, m]) => ({ id: mod, label: `Modul ${fmtModule(mod)}`, n: m.n, f1: m.f1, auc: m.auc })),
            ]}
            rowId={(r) => r.id}
            columns={[
              { id: "l", label: "Kelompok", rowHeader: true, cell: (r) => r.label },
              { id: "n", label: "n", align: "end", cell: (r) => fmtInt(r.n) },
              { id: "f1", label: "F1", align: "end", cell: (r) => fmtNum(r.f1, 3) },
              { id: "auc", label: "AUC", align: "end", cell: (r) => fmtNum(r.auc, 3) },
            ]}
          />
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Section
          title="Sinyal yang paling memengaruhi model"
          description={`Rata-rata |SHAP| komponen LightGBM pada kohort uji, dijumlahkan per sinyal. Sebanyak ${card.model.n_features} fitur dikelompokkan menjadi ${Object.keys(card.importance.by_signal).length} sinyal.`}
        >
          <ImportanceChart items={Object.values(card.importance.by_signal)} />
        </Section>
        <div className="flex flex-col gap-5">
          <Section title="Artefak dan reproduksibilitas" description="Setiap angka di halaman ini berasal dari model card yang dibangun ulang dari pipeline DSCO.">
            <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2.5 text-sm">
              <dt className="text-ink-3">Versi model</dt>
              <dd className="font-mono text-xs text-ink">{card.model.model_version}</dd>
              <dt className="text-ink-3">Fitur</dt>
              <dd className="text-ink">
                {card.model.n_features} kolom, {fmtInt(card.model.n_train)} baris train
              </dd>
              <dt className="text-ink-3">SHA256 model</dt>
              <dd className="font-mono text-xs break-all text-ink">{card.model.model_sha256}</dd>
              <dt className="text-ink-3">Library</dt>
              <dd className="font-mono text-xs text-ink">
                {Object.entries(card.model.versions)
                  .map(([k, v]) => `${k} ${v}`)
                  .join(", ")}
              </dd>
            </dl>
          </Section>
        </div>
      </div>
    </div>
  );

  const panels = [
    { id: "kartu", label: "Kartu model", content: overview },
    {
      id: "fairness",
      label: "Fairness",
      content: (
        <Section title="Fairness" description="Tingkat flag dan kualitas prediksi per kelompok. Fitur demografi tidak pernah dipakai sebagai alasan intervensi.">
          <FairnessTable fairness={card.fairness} />
        </Section>
      ),
    },
    {
      id: "drift",
      label: "Drift data",
      content: (
        <Suspense fallback={<div className="plate h-40 animate-pulse" aria-label="Memuat drift" />}>
          <DriftPanel />
        </Suspense>
      ),
    },
    ...(user.role === "advisor"
      ? []
      : [
          {
            id: "api",
            label: "Kesehatan API",
            content: (
              <Suspense fallback={<div className="plate h-40 animate-pulse" aria-label="Memuat statistik API" />}>
                <RequestPanel />
              </Suspense>
            ),
          },
        ]),
  ];
  return <ModelTabs panels={panels} />;
}

function DecisionBadge({ decision }: { decision: ModelCard["comparison"][number]["decision"] }) {
  const styles = {
    dipilih: "bg-blue text-white",
    ditolak: "bg-surface-tertiary text-ink-2",
    pembanding: "border border-line-strong text-ink-2",
  } as const;
  const labels = { dipilih: "Dipilih", ditolak: "Ditolak", pembanding: "Pembanding" } as const;
  return <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold", styles[decision])}>{labels[decision]}</span>;
}
