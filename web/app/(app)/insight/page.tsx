import type { Metadata } from "next";
import { Suspense } from "react";
import { CircleAlert } from "lucide-react";
import { WeeklyChart } from "@/components/charts/weekly-chart";
import { ApiError } from "@/components/domain/api-error";
import { KpiCard } from "@/components/domain/kpi-card";
import { Section } from "@/components/domain/section";
import { PageHeader } from "@/components/layout/page-header";
import { getInsights, type Insights, type ModuleInsight } from "@/lib/api";
import { fmtInt, fmtModule, fmtNum, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Insight Course" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Insight Course"
        description="Apa yang bisa diubah di desain course agar risiko terdeteksi lebih awal, per modul."
      />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Memuat insight...</p>}>
        <InsightContent />
      </Suspense>
    </>
  );
}

async function InsightContent() {
  const res = await getInsights();
  if (!res.ok) return <ApiError />;
  const insights = res.data;
  const modules = Object.entries(insights.modules);
  const flagged = modules.filter(([, m]) => m.recommendations.length > 0).length;
  const yMax = Math.ceil(
    Math.max(...modules.flatMap(([, m]) => [...m.weekly_median_interactions.at_risk, ...m.weekly_median_interactions.not_at_risk])) / 10,
  ) * 10;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-4">
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

      <div className="grid grid-cols-2 gap-6">
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
      <dl className="grid grid-cols-5 gap-2">
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
  const presentations = [...new Set(Object.values(insights.modules).flatMap((m) => Object.keys(m.presentations)))].sort();
  const rates = Object.values(insights.modules).flatMap((m) => Object.values(m.presentations).map((p) => p.at_risk_rate));
  const lo = Math.min(...rates);
  const hi = Math.max(...rates);
  // Sequential single hue: the at-risk color mixed into the card surface, 10% to 70%.
  const share = (rate: number) => Math.round(10 + ((rate - lo) / (hi - lo || 1)) * 60);
  return (
    <div>
      <table className="w-full table-fixed border-separate border-spacing-0.5 text-sm">
        <thead>
          <tr>
            <th className="w-24 text-left text-xs font-semibold text-muted-foreground">Modul</th>
            {presentations.map((p) => (
              <th key={p} className="text-xs font-semibold text-muted-foreground">
                {fmtModule(p)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(insights.modules).map(([code, m]) => (
            <tr key={code}>
              <th scope="row" className="text-left text-sm font-medium">
                {fmtModule(code)}
              </th>
              {presentations.map((p) => {
                const cell = m.presentations[p];
                if (!cell) return <td key={p} className="rounded-sm bg-background" aria-label="Tidak ada" />;
                const s = share(cell.at_risk_rate);
                return (
                  <td
                    key={p}
                    title={`${fmtModule(code)} ${fmtModule(p)}: ${fmtPct(cell.at_risk_rate, 1)} dari ${fmtInt(cell.n)} mahasiswa`}
                    // Ink text stays above 4.6:1 up to the 70% mix; white never reaches 3.5:1.
                    className="rounded-sm px-2 py-2 text-center font-mono text-foreground"
                    style={{ background: `color-mix(in oklch, var(--chart-1) ${s}%, var(--card))` }}
                  >
                    {fmtPct(cell.at_risk_rate)}
                    <span className="block text-[10px] opacity-80">n={fmtInt(cell.n)}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span>{fmtPct(lo)}</span>
        <span
          className="h-2 w-40 rounded-full"
          style={{ background: "linear-gradient(to right, color-mix(in oklch, var(--chart-1) 10%, var(--card)), color-mix(in oklch, var(--chart-1) 70%, var(--card)))" }}
          aria-hidden
        />
        <span>{fmtPct(hi)}</span>
      </div>
    </div>
  );
}
