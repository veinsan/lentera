import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, ListOrdered } from "lucide-react";
import { HeatmapTable } from "@/components/charts/heatmap-table";
import { SegmentedBar, type Segment } from "@/components/charts/segmented-bar";
import { ArchetypeChip } from "@/components/domain/archetype-chip";
import { CapacityGlance } from "@/components/domain/capacity-glance";
import { EmptyState } from "@/components/domain/empty-state";
import { Section } from "@/components/domain/section";
import { Stat } from "@/components/domain/stat";
import { TIER_LABELS, TierBadge } from "@/components/domain/tier-badge";
import { PageHeader } from "@/components/layout/page-header";
import { XRaySky } from "@/components/sky/sky-stage";
import { DataTable } from "@/components/ui/data-table";
import { LinkButton } from "@/components/ui/link-button";
import { getModelCard } from "@/lib/api";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { ARCHETYPE_VALUES, getCohortPredictions, getLatestCohort, TIER_VALUES, type Cohort, type PredictionLite } from "@/lib/data";
import { fmtInt, fmtModule, fmtPct, fmtProb } from "@/lib/format";
import { ACTION_LABELS } from "@/lib/labels";
import { NIGHT_TIER_COLORS, skyFrom } from "@/lib/sky";

export const metadata: Metadata = { title: "X-Ray kohort" };

const TIER_STYLE: Record<string, Pick<Segment, "className" | "textClassName">> = {
  // Label ink per fill: white only where it clears 4.5:1 (Kritis); ink elsewhere.
  critical: { className: "bg-tier-critical", textClassName: "text-white" },
  high: { className: "bg-tier-high", textClassName: "text-ink" },
  watch: { className: "bg-tier-watch", textClassName: "text-ink" },
  low: { className: "bg-tier-low", textClassName: "text-ink" },
};

export default function Page() {
  return (
    <Suspense fallback={<PageHeader title="Membaca kohort minggu ke-4..." description="Menyiapkan langit kohort." />}>
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
        <PageHeader title="Belum ada kohort minggu ke-4." description="Langit kohort muncul setelah ekspor data minggu ke-4 dinilai." />
        <EmptyState
          title="Belum ada kohort yang dinilai"
          description={
            manager
              ? "Unggah ekspor data minggu ke-4 untuk melihat X-Ray risiko, archetype, dan peta risiko per course."
              : "Koordinator belum mengunggah kohort minggu ke-4."
          }
          action={manager ? { href: "/unggah", label: "Unggah kohort" } : undefined}
        />
      </>
    );
  }

  const [preds, card] = await Promise.all([getCohortPredictions(cohort.id), getModelCard(user.accessToken)]);
  const flagged = preds.filter((p) => p.flagged);
  const critical = count(preds, (p) => p.tier === "critical");
  const expected = preds.reduce((s, p) => s + p.probability, 0);
  const uncertain = count(preds, (p) => p.uncertain);
  const ece = card.ok ? card.data.calibration.ece : null;

  return (
    <>
      <PageHeader
        title={
          manager ? (
            <>
              {fmtInt(flagged.length)} dari {fmtInt(preds.length)} mahasiswa ter&#8209;flag, {fmtInt(critical)} di antaranya kritis.
            </>
          ) : (
            <>
              {fmtInt(flagged.length)} mahasiswa di modul Anda ter&#8209;flag. Mulai dari {fmtInt(critical)} yang kritis.
            </>
          )
        }
        description={<Context cohort={cohort} user={user} preds={preds} />}
        actions={
          <>
            <LinkButton href="/prioritas" variant="primary">
              <ListOrdered aria-hidden /> Buka daftar prioritas
            </LinkButton>
            {manager && (
              <LinkButton href="/rencana" variant="secondary">
                Rencana kapasitas
              </LinkButton>
            )}
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="xray-title" className="night-plate rise relative flex min-h-[460px] flex-col overflow-hidden" style={{ "--i": 1 } as React.CSSProperties}>
          <div className="relative z-10 flex flex-wrap items-start justify-between gap-3 px-6 pt-5">
            <div>
              <h2 id="xray-title" className="text-[17px] font-semibold text-night-ink">
                Langit kohort
              </h2>
              <p className="mt-1 text-sm text-night-muted">
                Satu titik mewakili satu mahasiswa, dikelompokkan per archetype. Makin besar dan hangat titiknya, makin tinggi risikonya. Klik nama kelompok untuk membuka mahasiswanya.
              </p>
            </div>
            <ul aria-label="Arti warna titik" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-night-muted">
              {[...TIER_VALUES].reverse().map((t, i) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <span className="rounded-full" style={{ width: 5 + i * 2.6, height: 5 + i * 2.6, background: NIGHT_TIER_COLORS[i], boxShadow: `0 0 8px ${NIGHT_TIER_COLORS[i]}` }} />
                  {TIER_LABELS[t]}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative h-[440px] sm:h-[500px]">
            <div className="absolute inset-0">
              <XRaySky sky={skyFrom(preds, ARCHETYPE_VALUES)} />
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-5">
          <section className="plate rise grid grid-cols-2 gap-x-5 gap-y-6 p-5 sm:p-6 xl:grid-cols-1" style={{ "--i": 2 } as React.CSSProperties} aria-label="Ringkasan kohort">
            <Stat label="Perkiraan benar-benar berisiko" value={expected} note="jumlah probabilitas terkalibrasi" tone="blue" />
            <Stat label="Tier kritis" value={critical} note={`${fmtPct(critical / (preds.length || 1), 1)} dari kohort`} />
            <Stat label="Zona tidak pasti" value={uncertain} note="perlu tinjauan konselor sebelum bertindak" />
            {ece != null && <Stat label="Kalibrasi (ECE)" value={ece} format="dec4" note="selisih peluang dan kejadian" />}
          </section>
          {manager && (
            <div className="rise" style={{ "--i": 3 } as React.CSSProperties}>
              <CapacityGlance cohortId={cohort.id} />
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-5">
        {!manager && <CallFirst preds={flagged} />}
        <Section title="Distribusi tier risiko" description="Tier menentukan seberapa mendesak, sedangkan archetype di bawah menentukan tindakannya. Klik tier untuk membuka daftarnya.">
          <SegmentedBar
            ariaLabel="Distribusi tier risiko"
            segments={TIER_VALUES.map((t) => ({
              key: t,
              label: TIER_LABELS[t],
              value: count(preds, (p) => p.tier === t),
              href: t === "low" ? undefined : `/prioritas?tier=${t}`,
              ...TIER_STYLE[t],
            }))}
          />
        </Section>

        <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[3fr_2fr]">
          <Section title="Archetype dan tindakan" description="Alasan utama mahasiswa berisiko dan intervensi dari playbook. Klik baris untuk membuka daftarnya.">
            <ArchetypeTable preds={preds} />
          </Section>
          <Section title="Ringkasan per modul" description="Klik modul untuk membuka daftar prioritasnya.">
            <ModuleTable preds={preds} />
          </Section>
        </div>

        <Section title="Peta risiko per course" description="Rata-rata probabilitas prediksi per modul dan presentation pada kohort ini.">
          <CohortHeatmap preds={preds} />
        </Section>
      </div>
    </>
  );
}

function Context({ cohort, user, preds }: { cohort: Cohort; user: CurrentUser; preds: PredictionLite[] }) {
  const allModules = new Set(preds.map((p) => p.code_module)).size === 7 && user.modules.length >= 7;
  const scope = user.role === "admin" || allModules ? "semua modul" : `modul ${new Intl.ListFormat("id-ID").format(user.modules.map(fmtModule))}`;
  const uploaded = new Date(cohort.uploaded_at).toLocaleDateString("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" });
  return (
    <>
      {cohort.name}, diunggah {uploaded}, cutoff minggu ke-4 (hari ke-28), {scope}
    </>
  );
}

/** The advisor's first move: the ten highest-probability students in their modules. */
function CallFirst({ preds }: { preds: PredictionLite[] }) {
  const first = [...preds].sort((a, b) => b.probability - a.probability).slice(0, 10);
  return (
    <Section
      title="Hubungi lebih dulu"
      description="Sepuluh mahasiswa dengan probabilitas tertinggi di modul Anda."
      actions={
        <Link href="/prioritas" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-ink hover:underline">
          Semua <ArrowRight className="size-4" aria-hidden />
        </Link>
      }
    >
      <DataTable
        label="Mahasiswa yang dihubungi lebih dulu"
        rows={first}
        rowId={(p) => p.student_id}
        rowHref={(p) => `/mahasiswa/${p.student_id}`}
        columns={[
          { id: "id", label: "Mahasiswa", rowHeader: true, cell: (p) => <span className="font-mono font-semibold">{p.students.source_id}</span> },
          { id: "tier", label: "Tier", cell: (p) => <TierBadge tier={p.tier} /> },
          { id: "mod", label: "Modul", cell: (p) => fmtModule(p.code_module) },
          { id: "act", label: "Tindakan", cell: (p) => ACTION_LABELS[p.recommended_action] ?? p.recommended_action },
          { id: "p", label: "Probabilitas", align: "end", cell: (p) => <span className="font-semibold">{fmtProb(p.probability)}</span> },
        ]}
      />
    </Section>
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
    <DataTable
      label="Archetype dan tindakan"
      rows={rows}
      rowId={(r) => r.a}
      rowHref={(r) => `/prioritas?archetype=${r.a}`}
      columns={[
        { id: "a", label: "Archetype", rowHeader: true, cell: (r) => <ArchetypeChip archetype={r.a} /> },
        { id: "n", label: "Mahasiswa", align: "end", cell: (r) => fmtInt(r.n) },
        { id: "f", label: "Ter-flag", align: "end", cell: (r) => <span className="font-semibold">{fmtInt(r.flagged)}</span> },
        { id: "m", label: "Rata-rata prob.", align: "end", cell: (r) => fmtProb(r.mean) },
        { id: "act", label: "Tindakan", cell: (r) => <span className="text-ink-2">{r.action ? ACTION_LABELS[r.action] : "-"}</span> },
      ]}
    />
  );
}

function ModuleTable({ preds }: { preds: PredictionLite[] }) {
  const rows = [...new Set(preds.map((p) => p.code_module))].sort().map((m) => {
    const g = preds.filter((p) => p.code_module === m);
    return {
      m,
      n: g.length,
      flagged: count(g, (p) => p.flagged),
      critical: count(g, (p) => p.tier === "critical"),
      expected: g.reduce((s, p) => s + p.probability, 0),
    };
  });
  return (
    <DataTable
      label="Ringkasan per modul"
      rows={rows}
      rowId={(r) => r.m}
      rowHref={(r) => `/prioritas?module=${r.m}`}
      columns={[
        { id: "m", label: "Modul", rowHeader: true, cell: (r) => <span className="font-semibold">{fmtModule(r.m)}</span> },
        { id: "n", label: "Mahasiswa", align: "end", cell: (r) => fmtInt(r.n) },
        { id: "f", label: "Ter-flag", align: "end", cell: (r) => fmtInt(r.flagged) },
        { id: "c", label: "Kritis", align: "end", cell: (r) => fmtInt(r.critical) },
        { id: "e", label: "Perkiraan berisiko", align: "end", cell: (r) => <span className="font-semibold">{fmtInt(r.expected)}</span> },
      ]}
    />
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
