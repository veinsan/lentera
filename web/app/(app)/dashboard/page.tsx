import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Upload } from "lucide-react";
import { HeatmapTable } from "@/components/charts/heatmap-table";
import { SegmentedBar, type Segment } from "@/components/charts/segmented-bar";
import { EmptyState } from "@/components/domain/empty-state";
import { Section } from "@/components/domain/section";
import { TIER_LABELS, TierPin } from "@/components/domain/tier-badge";
import { TER_FLAG, WeekBoard, type CohortFacts } from "@/components/domain/week-board";
import { PageHeader } from "@/components/layout/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getModelCard } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { ARCHETYPE_VALUES, getCohortPredictions, getLatestCohort, TIER_VALUES, type PredictionLite } from "@/lib/data";
import { fmtInt, fmtModule, fmtProb, fmtPct } from "@/lib/format";
import { ACTION_LABELS, ARCHETYPE_LABELS } from "@/lib/labels";

export const metadata: Metadata = { title: "Papan Minggu Ini" };

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
          <PageHeader title="Papan minggu ini" description="Memuat kohort..." />
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
        <PageHeader title="Papan minggu ini" description="Ringkasan risiko kohort pada cutoff minggu ke-4." />
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

  const [preds, card] = await Promise.all([getCohortPredictions(cohort.id), getModelCard(user.accessToken)]);
  const flagged = preds.filter((p) => p.flagged);
  const expected = preds.reduce((s, p) => s + p.probability, 0);
  const allModules = new Set(preds.map((p) => p.code_module)).size === 7 && user.modules.length >= 7;
  const scope = user.role === "admin" || allModules ? "semua modul" : user.modules.map(fmtModule).join(", ");
  const uploaded = new Date(cohort.uploaded_at).toLocaleDateString("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" });

  const context = `${cohort.name} · diunggah ${uploaded} · cutoff hari ke-28 · ${scope}`;
  const facts = {
    scored: preds.length,
    flagged: flagged.length,
    expected,
    critical: count(preds, (p) => p.tier === "critical"),
    uncertain: count(preds, (p) => p.uncertain),
    ece: card.ok ? card.data.calibration.ece : null,
    context,
  };

  return (
    <>
      <div className="mb-6">{manager ? <WeekBoard cohortId={cohort.id} facts={facts} /> : <AdvisorWeek preds={preds} facts={facts} />}</div>
      <div className="flex flex-col gap-6">
        <Section title="Distribusi tier risiko" description="Tier menentukan seberapa mendesak; archetype di bawah menentukan tindakannya.">
          <SegmentedBar
            ariaLabel="Distribusi tier risiko"
            segments={TIER_VALUES.map((t) => ({ key: t, label: TIER_LABELS[t], value: count(preds, (p) => p.tier === t), ...TIER_STYLE[t] }))}
          />
        </Section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
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

/** The advisor's board: no capacity control (planning is the coordinator's), the first students to call instead. */
function AdvisorWeek({ preds, facts }: { preds: PredictionLite[]; facts: CohortFacts }) {
  const first = preds.filter((p) => p.flagged).sort((a, b) => b.probability - a.probability).slice(0, 10);
  return (
    <div className="flex flex-col gap-5">
      <section className="sheet relative px-8 pt-8 pb-7">
        <span aria-hidden className="absolute -top-1.5 left-1/2 size-4 -translate-x-1/2 rounded-full bg-foreground" />
        <h1 className="max-w-4xl font-heading text-[2rem] leading-[1.06] sm:text-[2.75rem] font-bold tracking-[-0.025em] text-balance [font-stretch:88%]">
          <span className="marker">{fmtInt(facts.flagged)}</span> mahasiswa di modul Anda {TER_FLAG}. Mulai dari{" "}
          <span className="marker">{fmtInt(facts.critical)}</span> yang kritis.
        </h1>
        <p className="mt-5 text-xs text-muted-foreground">{facts.context}</p>
      </section>
      <section className="rounded-2xl bg-secondary p-5">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-heading text-xl font-bold [font-stretch:92%]">Hubungi lebih dulu</h2>
          <Link href="/prioritas" className="text-sm font-semibold hover:underline">Buka daftar prioritas</Link>
        </div>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {first.map((p) => (
            <li key={p.student_id}>
              <Link href={`/mahasiswa/${p.student_id}`} className="group relative block rounded-xl bg-card py-2.5 pr-3 pl-8 transition hover:-translate-y-0.5 hover:shadow-overlay">
                <TierPin tier={p.tier} className="absolute top-3.5 left-3 ring-0" />
                <span className="flex items-baseline justify-between gap-2">
                  <b className="font-mono text-[13px] font-semibold">{p.students.source_id}</b>
                  <span className="font-mono text-[13px] font-semibold">{fmtProb(p.probability)}</span>
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {fmtModule(p.code_module)} · {ACTION_LABELS[p.recommended_action] ?? p.recommended_action}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
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
