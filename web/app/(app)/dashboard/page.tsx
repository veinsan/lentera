import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Upload } from "lucide-react";
import { HeatmapTable } from "@/components/charts/heatmap-table";
import { SegmentedBar, type Segment } from "@/components/charts/segmented-bar";
import { EmptyState } from "@/components/domain/empty-state";
import { KpiCard } from "@/components/domain/kpi-card";
import { Section } from "@/components/domain/section";
import { TIER_LABELS } from "@/components/domain/tier-badge";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser } from "@/lib/auth";
import { ARCHETYPE_VALUES, getCohortPredictions, getLatestCohort, TIER_VALUES, type PredictionLite } from "@/lib/data";
import { fmtInt, fmtModule, fmtProb, fmtPct } from "@/lib/format";
import { ACTION_LABELS, ARCHETYPE_LABELS } from "@/lib/labels";

export const metadata: Metadata = { title: "Dashboard" };

const TIER_STYLE: Record<string, Pick<Segment, "className" | "textClassName">> = {
  critical: { className: "bg-risk-critical", textClassName: "text-on-risk-dark" },
  high: { className: "bg-risk-high", textClassName: "text-on-risk-dark" },
  watch: { className: "bg-risk-watch", textClassName: "text-on-risk-light" },
  low: { className: "bg-risk-low", textClassName: "text-on-risk-light" },
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="Dashboard" description="Memuat kohort..." />
        </>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const [user, cohort] = await Promise.all([getCurrentUser(), getLatestCohort()]);
  const manager = user.role !== "advisor";
  if (!cohort) {
    return (
      <>
        <PageHeader title="Dashboard" description="Ringkasan risiko kohort pada cutoff minggu ke-4." />
        <EmptyState
          icon={Upload}
          title="Belum ada kohort yang dinilai"
          description={
            manager
              ? "Unggah ekspor data minggu ke-4 untuk melihat tier risiko, archetype, dan peta risiko per course."
              : "Koordinator belum mengunggah kohort minggu ke-4."
          }
          action={manager ? { href: "/unggah", label: "Unggah kohort" } : undefined}
        />
      </>
    );
  }

  const preds = await getCohortPredictions(cohort.id);
  const flagged = preds.filter((p) => p.flagged);
  const expected = preds.reduce((s, p) => s + p.probability, 0);
  const allModules = new Set(preds.map((p) => p.code_module)).size === 7 && user.modules.length >= 7;
  const scope = user.role === "admin" || allModules ? "semua modul" : user.modules.map(fmtModule).join(", ");
  const uploaded = new Date(cohort.uploaded_at).toLocaleDateString("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" });

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`${cohort.name} · diunggah ${uploaded} · cutoff hari ke-28 · ${scope}`}
        actions={
          <div className="flex gap-2">
            <Link href="/prioritas" className={buttonVariants({ variant: "outline" })}>
              Daftar prioritas
            </Link>
            {manager && (
              <Link href="/rencana" className={buttonVariants({ className: "hover:bg-primary-hover" })}>
                Susun rencana intervensi
              </Link>
            )}
          </div>
        }
      />
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-5 gap-4">
          <KpiCard label="Mahasiswa dinilai" value={fmtInt(preds.length)} note={`dari ${fmtInt(cohort.n_rows)} di kohort`} />
          <KpiCard highlight label="Ter-flag berisiko" value={fmtInt(flagged.length)} note={`${fmtPct(flagged.length / preds.length)} · threshold 0,375`} />
          <KpiCard label="Perkiraan benar-benar berisiko" value={fmtInt(expected)} note="Jumlah probabilitas terkalibrasi" />
          <KpiCard label="Tier kritis" value={fmtInt(count(preds, (p) => p.tier === "critical"))} note="Probabilitas 0,85 ke atas" />
          <KpiCard label="Zona tidak pasti" value={fmtInt(count(preds, (p) => p.uncertain))} note="Butuh tinjauan konselor" />
        </div>

        <Section title="Distribusi tier risiko" description="Tier menentukan seberapa mendesak; archetype di bawah menentukan tindakannya.">
          <SegmentedBar
            ariaLabel="Distribusi tier risiko"
            segments={TIER_VALUES.map((t) => ({ key: t, label: TIER_LABELS[t], value: count(preds, (p) => p.tier === t), ...TIER_STYLE[t] }))}
          />
        </Section>

        <div className="grid grid-cols-[3fr_2fr] gap-6">
          <Section title="Archetype dan tindakan" description="Alasan utama mahasiswa berisiko dan intervensi yang direkomendasikan playbook.">
            <ArchetypeTable preds={preds} />
          </Section>
          <Section title="Ringkasan per modul" description="Klik modul untuk membuka daftar prioritasnya.">
            <ModuleTable preds={preds} />
          </Section>
        </div>

        <Section title="Peta risiko per course" description="Rata-rata probabilitas prediksi per modul x presentation pada kohort ini.">
          <CohortHeatmap preds={preds} />
        </Section>
      </div>
    </>
  );
}

function count(preds: PredictionLite[], fn: (p: PredictionLite) => boolean) {
  return preds.reduce((n, p) => n + (fn(p) ? 1 : 0), 0);
}

function ArchetypeTable({ preds }: { preds: PredictionLite[] }) {
  const rows = ARCHETYPE_VALUES.map((a) => {
    const group = preds.filter((p) => p.archetype === a);
    return {
      a,
      n: group.length,
      flagged: count(group, (p) => p.flagged),
      mean: group.length ? group.reduce((s, p) => s + p.probability, 0) / group.length : null,
      action: group[0]?.recommended_action,
    };
  });
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Archetype</TableHead>
          <TableHead className="text-right">Mahasiswa</TableHead>
          <TableHead className="text-right">Ter-flag</TableHead>
          <TableHead className="text-right">Rata-rata prob.</TableHead>
          <TableHead>Tindakan</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.a}>
            <TableCell>
              <Link href={`/prioritas?archetype=${r.a}`} className="font-medium hover:underline">
                {ARCHETYPE_LABELS[r.a]}
              </Link>
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">{fmtInt(r.n)}</TableCell>
            <TableCell className="text-right font-mono tabular-nums">{fmtInt(r.flagged)}</TableCell>
            <TableCell className="text-right font-mono tabular-nums">{fmtProb(r.mean)}</TableCell>
            <TableCell className="whitespace-normal text-xs text-muted-foreground">{r.action ? ACTION_LABELS[r.action] : "-"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ModuleTable({ preds }: { preds: PredictionLite[] }) {
  const modules = [...new Set(preds.map((p) => p.code_module))].sort();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Modul</TableHead>
          <TableHead className="text-right">Mahasiswa</TableHead>
          <TableHead className="text-right">Ter-flag</TableHead>
          <TableHead className="text-right">Kritis</TableHead>
          <TableHead className="text-right">Perkiraan berisiko</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {modules.map((m) => {
          const g = preds.filter((p) => p.code_module === m);
          return (
            <TableRow key={m}>
              <TableCell>
                <Link href={`/prioritas?module=${m}`} className="font-medium hover:underline">
                  {fmtModule(m)}
                </Link>
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">{fmtInt(g.length)}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">{fmtInt(count(g, (p) => p.flagged))}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">{fmtInt(count(g, (p) => p.tier === "critical"))}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">{fmtInt(g.reduce((s, p) => s + p.probability, 0))}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function CohortHeatmap({ preds }: { preds: PredictionLite[] }) {
  const sums: Record<string, Record<string, { total: number; n: number }>> = {};
  for (const p of preds) {
    const cell = ((sums[p.code_module] ??= {})[p.students.code_presentation] ??= { total: 0, n: 0 });
    cell.total += p.probability;
    cell.n += 1;
  }
  const rows = Object.keys(sums).sort();
  const cols = [...new Set(preds.map((p) => p.students.code_presentation))].sort();
  const cells = Object.fromEntries(
    rows.map((r) => [r, Object.fromEntries(Object.entries(sums[r]).map(([c, v]) => [c, { value: v.total / v.n, n: v.n }]))]),
  );
  return <HeatmapTable rows={rows} cols={cols} cells={cells} format={(v) => fmtPct(v)} label="rata-rata probabilitas" />;
}
