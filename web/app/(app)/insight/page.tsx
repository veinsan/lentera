import type { Metadata } from "next";
import { Suspense } from "react";
import { CircleAlert } from "lucide-react";
import { HeatmapTable } from "@/components/charts/heatmap-table";
import { WeeklyChart } from "@/components/charts/weekly-chart";
import { ApiError } from "@/components/domain/api-error";
import { KpiCard } from "@/components/domain/kpi-card";
import { Section } from "@/components/domain/section";
import { PageHeader } from "@/components/layout/page-header";
import { getInsights, type Insights, type ModuleInsight } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { fmtInt, fmtModule, fmtNum, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Insight Course" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Modul tanpa asesmen yang dinilai di minggu ke-4 paling sulit diprediksi."
        description="Apa yang bisa diubah di desain course agar risiko terdeteksi lebih awal, per modul."
      />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Memuat insight...</p>}>
        <InsightContent />
      </Suspense>
    </>
  );
}

async function InsightContent() {
  const res = await getInsights((await getCurrentUser()).accessToken);
  if (!res.ok) return <ApiError />;
  const insights = res.data;
  const modules = Object.entries(insights.modules);
  const flagged = modules.filter(([, m]) => m.recommendations.length > 0).length;
  const yMax = Math.ceil(
    Math.max(...modules.flatMap(([, m]) => [...m.weekly_median_interactions.at_risk, ...m.weekly_median_interactions.not_at_risk])) / 10,
  ) * 10;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard highlight label="Modul dengan rekomendasi" value={`${flagged} dari ${modules.length}`} note={insights.source} />
        <KpiCard label="Tingkat at-risk seluruh modul" value={fmtPct(insights.overall.at_risk_rate, 1)} />
        <KpiCard
          label="Mahasiswa di zona tidak pasti"
          value={fmtPct(insights.overall.uncertain_share, 1)}
          note="Probabilitas 0,25 sampai 0,55"
        />
      </div>

      <Section title="Tingkat at-risk per course" description="Modul x presentation pada data train. Sel kosong berarti course tersebut tidak ada.">
        <RiskHeatmap insights={insights} />
      </Section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {modules.map(([code, m]) => (
          <ModuleCard key={code} code={code} module={m} yMax={yMax} cutoffs={insights.cutoffs} />
        ))}
      </div>
    </div>
  );
}

function ModuleCard({
  code,
  module: m,
  yMax,
  cutoffs,
}: {
  code: string;
  module: ModuleInsight;
  yMax: number;
  cutoffs: Insights["cutoffs"];
}) {
  const stats = [
    { label: "Mahasiswa", value: fmtInt(m.n) },
    { label: "Risiko dasar", value: fmtPct(m.at_risk_rate), warn: m.at_risk_rate >= cutoffs.high_base_risk },
    { label: "AUC model", value: fmtNum(m.auc, 2), warn: m.auc < cutoffs.low_auc },
    { label: "Zona tidak pasti", value: fmtPct(m.uncertain_share), warn: m.uncertain_share > cutoffs.high_uncertain },
    { label: "Sudah dinilai", value: fmtPct(m.graded_share), warn: m.graded_share === 0 },
  ];
  return (
    <Section title={`Modul ${fmtModule(code)}`}>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label}>
            <dt className="text-xs text-muted-foreground">{s.label}</dt>
            <dd className={cn("font-mono text-base font-semibold", s.warn && "text-risk-high")}>
              {s.value}
              {s.warn && <span className="sr-only"> (perlu perhatian)</span>}
            </dd>
          </div>
        ))}
      </dl>

      {m.recommendations.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {m.recommendations.map((r) => (
            <li key={r.code} className="flex gap-2 rounded-md bg-muted p-3 text-sm">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-risk-high" aria-hidden />
              <span>{r.text}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Tidak ada rekomendasi desain untuk modul ini.</p>
      )}

      <div className="mt-4">
        <p className="mb-1 text-xs font-semibold text-muted-foreground">Median interaksi mingguan (mahasiswa dengan catatan LMS)</p>
        <WeeklyChart weekly={m.weekly_median_interactions} yMax={yMax} />
      </div>
    </Section>
  );
}

function RiskHeatmap({ insights }: { insights: Insights }) {
  const rows = Object.keys(insights.modules);
  const cols = [...new Set(Object.values(insights.modules).flatMap((m) => Object.keys(m.presentations)))].sort();
  const cells = Object.fromEntries(
    Object.entries(insights.modules).map(([code, m]) => [
      code,
      Object.fromEntries(Object.entries(m.presentations).map(([p, c]) => [p, { value: c.at_risk_rate, n: c.n }])),
    ]),
  );
  return <HeatmapTable rows={rows} cols={cols} cells={cells} format={(v) => fmtPct(v)} label="tingkat at-risk" />;
}
