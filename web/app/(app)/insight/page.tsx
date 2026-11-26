import type { Metadata } from "next";
import { Suspense } from "react";
import { CircleAlert } from "lucide-react";
import { HeatmapTable } from "@/components/charts/heatmap-table";
import { WeeklyChart } from "@/components/charts/weekly-chart";
import { ApiError } from "@/components/domain/api-error";
import { CampusActions } from "@/components/domain/campus-actions";
import { Section } from "@/components/domain/section";
import { Stat } from "@/components/domain/stat";
import { PageHeader } from "@/components/layout/page-header";
import { getInsights, type Insights, type ModuleInsight } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { fmtInt, fmtModule, fmtNum, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Insight course",
  description: "Modul dan presentation dengan risiko tertinggi, keandalan prediksi per modul, dan rekomendasi untuk koordinator course.",
};

export default function Page() {
  return (
    <>
      <PageHeader
        title="Tiga sinyal di empat minggu pertama bisa langsung dijadikan aturan kampus."
        description="Aturan yang bisa dipasang pimpinan kampus, lalu apa yang bisa diubah di desain course agar risiko terdeteksi lebih awal, per modul, dari data train DSCO."
      />
      <Suspense fallback={<div className="plate h-40 animate-pulse" aria-label="Memuat insight" />}>
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
  const yMax =
    Math.ceil(
      Math.max(...modules.flatMap(([, m]) => [...m.weekly_median_interactions.at_risk, ...m.weekly_median_interactions.not_at_risk])) / 10,
    ) * 10;

  return (
    <div className="flex flex-col gap-5">
      <section className="plate rise grid grid-cols-1 gap-6 p-5 sm:grid-cols-3 sm:p-6" style={{ "--i": 1 } as React.CSSProperties}>
        <div>
          <p className="text-[13px] font-medium text-ink-3">Modul dengan rekomendasi desain</p>
          <p className="numeral mt-1.5 text-[1.9rem] text-blue">
            {flagged} <span className="text-ink-3">dari {modules.length}</span>
          </p>
          <p className="mt-1 text-xs text-ink-3">{insights.source}</p>
        </div>
        <Stat label="Tingkat at-risk seluruh modul" value={insights.overall.at_risk_rate} format="pct1" />
        <Stat label="Mahasiswa di zona tidak pasti" value={insights.overall.uncertain_share} format="pct1" note="butuh tinjauan manusia sebelum bertindak" />
      </section>

      <CampusActions />

      <Section title="Tingkat at-risk per course" description="Modul dan presentation pada data train. Sel kosong berarti course tersebut tidak ada.">
        <RiskHeatmap insights={insights} />
      </Section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {modules.map(([code, m]) => (
          <ModuleCard key={code} code={code} module={m} yMax={yMax} cutoffs={insights.cutoffs} />
        ))}
      </div>
    </div>
  );
}

function ModuleCard({ code, module: m, yMax, cutoffs }: { code: string; module: ModuleInsight; yMax: number; cutoffs: Insights["cutoffs"] }) {
  const stats = [
    { label: "Mahasiswa", value: fmtInt(m.n) },
    { label: "Risiko dasar", value: fmtPct(m.at_risk_rate), warn: m.at_risk_rate >= cutoffs.high_base_risk },
    { label: "AUC model", value: fmtNum(m.auc, 2), warn: m.auc < cutoffs.low_auc },
    { label: "Zona tidak pasti", value: fmtPct(m.uncertain_share), warn: m.uncertain_share > cutoffs.high_uncertain },
    { label: "Sudah dinilai", value: fmtPct(m.graded_share), warn: m.graded_share === 0 },
  ];
  return (
    <Section title={`Modul ${fmtModule(code)}`}>
      <dl className="grid grid-cols-3 gap-x-4 gap-y-3 sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label}>
            <dt className="text-xs text-ink-3">{s.label}</dt>
            <dd className={cn("mt-0.5 text-lg font-semibold tabular-nums", s.warn ? "text-tier-critical" : "text-ink")}>
              {s.value}
              {s.warn && <span className="sr-only"> (perlu perhatian)</span>}
            </dd>
          </div>
        ))}
      </dl>

      {m.recommendations.length > 0 ? (
        <ul className="mt-5 space-y-2">
          {m.recommendations.map((r) => (
            <li key={r.code} className="flex gap-3 rounded-2xl bg-surface-secondary p-3.5 text-sm leading-relaxed text-ink">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-tier-critical" aria-hidden />
              <span>{r.text}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 text-sm text-ink-3">Tidak ada rekomendasi desain untuk modul ini.</p>
      )}

      <div className="mt-5">
        <p className="mb-2 text-xs font-medium text-ink-3">Median interaksi mingguan (mahasiswa dengan catatan LMS)</p>
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
