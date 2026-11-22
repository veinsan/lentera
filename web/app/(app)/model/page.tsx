import type { Metadata } from "next";
import { Suspense } from "react";
import { Activity } from "lucide-react";
import { AblationChart } from "@/components/charts/ablation-chart";
import { CalibrationChart } from "@/components/charts/calibration-chart";
import { CapacityChart } from "@/components/charts/capacity-chart";
import { ImportanceChart } from "@/components/charts/importance-chart";
import { ApiError } from "@/components/domain/api-error";
import { EmptyState } from "@/components/domain/empty-state";
import { FairnessTable } from "@/components/domain/fairness-table";
import { KpiCard } from "@/components/domain/kpi-card";
import { Section } from "@/components/domain/section";
import { TierBadge } from "@/components/domain/tier-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getModelCard, type ModelCard, type Tier } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { fmtInt, fmtModule, fmtNum, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Model & Monitoring" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Model & Monitoring"
        description="Cara model dibangun, divalidasi, dan seberapa jauh prediksinya bisa dipercaya."
      />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Memuat model card...</p>}>
        <ModelContent />
      </Suspense>
    </>
  );
}

// M07 is listed with the other modules below, so it is not repeated as a segment.
const SEGMENTS: Partial<Record<keyof ModelCard["segments_seed42"], string>> = {
  all: "Semua mahasiswa",
  active: "Punya catatan LMS",
  hard: "Segmen sulit: aktif, tanpa missed submission",
  no_activity: "Tanpa catatan LMS (placeholder)",
};

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const TIER_ORDER: Tier[] = ["critical", "high", "watch", "low"];

async function ModelContent() {
  const res = await getModelCard((await getCurrentUser()).accessToken);
  if (!res.ok) return <ApiError />;
  const card = res.data;
  const { nested, leaderboard, calibration, segments_seed42: seg } = card;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-5 gap-4">
        <KpiCard
          highlight
          label="F1 validasi bertingkat"
          value={fmtNum(nested.mean_f1, 4)}
          note={`SD antar-seed ${fmtNum(nested.sd_f1, 4)} (${nested.per_seed.length} seed)`}
        />
        <KpiCard
          label="F1 public leaderboard"
          value={fmtNum(leaderboard.public_f1, 5)}
          note={`Private: ${leaderboard.private_f1 == null ? "belum tercatat" : fmtNum(leaderboard.private_f1, 5)}`}
        />
        <KpiCard label="AUC (seed 42)" value={fmtNum(seg.all.auc, 4)} note={`${fmtInt(seg.all.n)} baris train`} />
        <KpiCard label="Threshold" value={fmtNum(card.model.threshold, 3)} note="Dipilih di inner fold, bukan 0,5" />
        <KpiCard label="Kalibrasi (ECE)" value={fmtNum(calibration.ece, 4)} note={`Brier ${fmtNum(calibration.brier, 3)}`} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Section title="Validasi bertingkat" description={`${sentence(card.protocol.inference)}.`}>
          <ul className="mb-4 list-disc space-y-1 pl-5 text-sm">
            <li>Outer: {card.protocol.outer}.</li>
            <li>Inner: {card.protocol.inner}.</li>
            <li>Early stopping: {card.protocol.early_stopping}.</li>
          </ul>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Seed</TableHead>
                <TableHead className="text-right">F1</TableHead>
                <TableHead className="text-right">Presisi</TableHead>
                <TableHead className="text-right">Recall</TableHead>
                <TableHead className="text-right">AUC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="font-mono tabular-nums">
              {nested.per_seed.map((s) => (
                <TableRow key={s.seed}>
                  <TableCell>{s.seed}</TableCell>
                  <TableCell className="text-right">{fmtNum(s.f1, 4)}</TableCell>
                  <TableCell className="text-right">{fmtNum(s.precision, 4)}</TableCell>
                  <TableCell className="text-right">{fmtNum(s.recall, 4)}</TableCell>
                  <TableCell className="text-right">{fmtNum(s.auc, 4)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>

        <Section
          title="Ablation preprocessing"
          description="CatBoost 500 trees pada fold yang sama, sehingga perbedaan berasal dari representasi data, bukan jumlah trees."
        >
          <AblationChart rows={card.ablation} />
        </Section>
      </div>

      <Section
        title="Perbandingan metode"
        description="Setiap kandidat memakai fold dan seed yang sama. Komponen tambahan hanya dipakai jika kontribusinya konsisten, termasuk pada segmen sulit dan M07."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metode</TableHead>
              <TableHead className="text-right">F1</TableHead>
              <TableHead className="text-right">SD</TableHead>
              <TableHead className="text-right">AUC</TableHead>
              <TableHead className="text-right">F1 sulit</TableHead>
              <TableHead className="text-right">F1 M07</TableHead>
              <TableHead>Keputusan</TableHead>
              <TableHead>Alasan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {card.comparison.map((m) => (
              <TableRow key={m.method} className={cn(m.decision === "dipilih" && "bg-muted/60")}>
                <TableCell className="font-mono text-xs">{m.method}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{fmtNum(m.f1, 4)}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{m.seeds > 1 ? fmtNum(m.f1_sd, 4) : "-"}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{fmtNum(m.auc, 4)}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{fmtNum(m.hard_f1, 4)}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{fmtNum(m.m07_f1, 4)}</TableCell>
                <TableCell>
                  <DecisionBadge decision={m.decision} />
                </TableCell>
                <TableCell className="max-w-sm whitespace-normal text-xs text-muted-foreground">{m.reason ?? ""}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <div className="grid grid-cols-2 gap-6">
        <Section
          title="Kalibrasi probabilitas"
          description="Titik dekat garis diagonal berarti probabilitas bisa dibaca apa adanya: dari 100 mahasiswa dengan prediksi 0,8, sekitar 80 benar-benar berisiko."
        >
          <CalibrationChart bins={calibration.bins} />
        </Section>
        <Section
          title="Presisi saat kapasitas terbatas"
          description="Jika konselor hanya bisa menghubungi sebagian mahasiswa, urutan probabilitas menjaga presisi tetap tinggi."
        >
          <CapacityChart points={card.capacity_curve} />
        </Section>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Section title="Tier risiko" description={card.evaluation_notes.calibration_and_tiers}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Mahasiswa</TableHead>
                <TableHead className="text-right">At-risk aktual</TableHead>
                <TableHead className="text-right">Porsi dari semua at-risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="font-mono tabular-nums">
              {TIER_ORDER.map((t) => (
                <TableRow key={t}>
                  <TableCell>
                    <TierBadge tier={t} />
                  </TableCell>
                  <TableCell className="text-right">{fmtInt(card.tiers[t].n)}</TableCell>
                  <TableCell className="text-right">{fmtPct(card.tiers[t].at_risk_rate, 1)}</TableCell>
                  <TableCell className="text-right">{fmtPct(card.tiers[t].share_of_at_risk, 1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>

        <Section title="Keandalan per segmen dan modul" description={card.evaluation_notes.per_module_and_fairness}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kelompok</TableHead>
                <TableHead className="text-right">n</TableHead>
                <TableHead className="text-right">F1</TableHead>
                <TableHead className="text-right">AUC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="font-mono tabular-nums">
              {(Object.keys(SEGMENTS) as (keyof typeof SEGMENTS)[]).map((k) => (
                <TableRow key={k}>
                  <TableCell className="font-sans">{SEGMENTS[k]}</TableCell>
                  <TableCell className="text-right">{fmtInt(seg[k].n)}</TableCell>
                  <TableCell className="text-right">{fmtNum(seg[k].f1, 3)}</TableCell>
                  <TableCell className="text-right">{fmtNum(seg[k].auc, 3)}</TableCell>
                </TableRow>
              ))}
              {Object.entries(card.per_module).map(([mod, m]) => (
                <TableRow key={mod}>
                  <TableCell className="font-sans">Modul {fmtModule(mod)}</TableCell>
                  <TableCell className="text-right">{fmtInt(m.n)}</TableCell>
                  <TableCell className="text-right">{fmtNum(m.f1, 3)}</TableCell>
                  <TableCell className="text-right">{fmtNum(m.auc, 3)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Section
          title="Sinyal yang paling memengaruhi model"
          description="Importance CatBoost (PredictionValuesChange) dijumlahkan per sinyal; 77 fitur dikelompokkan menjadi 14 sinyal."
        >
          <ImportanceChart items={Object.values(card.importance.by_signal)} />
        </Section>
        <div className="flex flex-col gap-6">
          <Section title="Uji transfer ke presentation baru" description={card.presentation_stress.note}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Presentation di-hold-out</TableHead>
                  <TableHead className="text-right">n</TableHead>
                  <TableHead className="text-right">F1</TableHead>
                  <TableHead className="text-right">AUC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="font-mono tabular-nums">
                {card.presentation_stress.per_presentation.map((p) => (
                  <TableRow key={p.presentation}>
                    <TableCell>{p.presentation}</TableCell>
                    <TableCell className="text-right">{fmtInt(p.n)}</TableCell>
                    <TableCell className="text-right">{fmtNum(p.f1, 3)}</TableCell>
                    <TableCell className="text-right">{fmtNum(p.auc, 3)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>

          <Section title="Artefak dan reproduksibilitas" description="Model yang di-deploy menghasilkan ulang submission yang dinilai di Kaggle.">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Versi model</dt>
              <dd className="font-mono text-xs">{card.model.model_version}</dd>
              <dt className="text-muted-foreground">Fitur</dt>
              <dd className="font-mono text-xs">{card.model.n_features} kolom, {fmtInt(card.model.n_train)} baris train</dd>
              <dt className="text-muted-foreground">SHA256 model</dt>
              <dd className="break-all font-mono text-xs">{card.model.model_sha256}</dd>
              <dt className="text-muted-foreground">Submission Kaggle</dt>
              <dd className="font-mono text-xs">ref {leaderboard.submission_ref}, {leaderboard.submitted_utc} UTC</dd>
              <dt className="text-muted-foreground">SHA256 submission</dt>
              <dd className="break-all font-mono text-xs">{leaderboard.submission_sha256}</dd>
              <dt className="text-muted-foreground">Library</dt>
              <dd className="font-mono text-xs">
                {Object.entries(card.model.versions).map(([k, v]) => `${k} ${v}`).join(", ")}
              </dd>
            </dl>
          </Section>
        </div>
      </div>

      <Section
      title="Fairness"
        description="Tingkat flag dan kualitas prediksi per kelompok. Fitur demografi tidak pernah dipakai sebagai alasan intervensi."
      >
        <FairnessTable fairness={card.fairness} />
      </Section>

      <Section title="Drift dan kesehatan API" description="Perbandingan distribusi kohort dengan data train (PSI), latency, dan error rate.">
        <EmptyState
          icon={Activity}
          title="Belum ada kohort dan log request"
          description="Drift dihitung setiap kali kohort diunggah, dan statistik request tersedia setelah logging API aktif."
        />
      </Section>
    </div>
  );
}

function DecisionBadge({ decision }: { decision: ModelCard["comparison"][number]["decision"] }) {
  const styles = {
    dipilih: "bg-primary text-primary-foreground",
    ditolak: "bg-muted text-muted-foreground",
    pembanding: "border text-muted-foreground",
  } as const;
  const labels = { dipilih: "Dipilih", ditolak: "Ditolak", pembanding: "Pembanding" } as const;
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", styles[decision])}>{labels[decision]}</span>;
}
