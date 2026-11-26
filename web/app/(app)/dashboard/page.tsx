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
import { Num, Stat } from "@/components/domain/stat";
import { TIER_LABELS, TierBadge } from "@/components/domain/tier-badge";
import { PageHeader } from "@/components/layout/page-header";
import { XRaySky } from "@/components/sky/sky-stage";
import { DataTable } from "@/components/ui/data-table";
import { LinkButton } from "@/components/ui/link-button";
import { getModelCard } from "@/lib/api";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { ARCHETYPE_VALUES, contactedStatus, getCohortPredictions, getLatestCohort, TIER_VALUES, type Cohort, type PredictionLite } from "@/lib/data";
import { fmtInt, fmtModule, fmtNum, fmtPct, fmtProb } from "@/lib/format";
import { ACTION_LABELS, ARCHETYPE_LABELS, CONTACT_STATUS_LABELS } from "@/lib/labels";
import { landing } from "@/lib/landing";
import { NIGHT_TIER_COLORS, skyFrom } from "@/lib/sky";

export const metadata: Metadata = {
  title: "X-Ray kohort",
  description: "Sebaran risiko kohort minggu ke-4 per tier, archetype, dan modul, dengan jumlah mahasiswa yang perlu dihubungi lebih dulu.",
};

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

  const [preds, card, contacts] = await Promise.all([getCohortPredictions(cohort.id), getModelCard(user.accessToken), contactedStatus(cohort.id)]);
  const flagged = preds.filter((p) => p.flagged);
  const critical = count(preds, (p) => p.tier === "critical");
  const urgent = critical + count(preds, (p) => p.tier === "high");
  const expected = preds.reduce((s, p) => s + p.probability, 0);
  const uncertain = count(preds, (p) => p.uncertain);
  const modules = new Set(preds.map((p) => p.code_module)).size;
  const ece = card.ok ? card.data.calibration.ece : null;

  return (
    <>
      <PageHeader
        title={
          manager ? (
            <>Ada {fmtInt(flagged.length)} mahasiswa yang perlu perhatian minggu ini.</>
          ) : (
            <>Ada {fmtInt(flagged.length)} mahasiswa di modul Anda yang perlu perhatian minggu ini.</>
          )
        }
        description={
          <>
            Lentera sudah membaca data {fmtInt(preds.length)} mahasiswa dari empat minggu pertama kuliah. Mulai dari{" "}
            <b className="font-semibold text-ink">{fmtInt(critical)} mahasiswa kritis</b>, lalu lanjut ke tier berikutnya.
            <span className="mt-1 block text-[13px] text-ink-3">
              <Context cohort={cohort} user={user} preds={preds} />
            </span>
          </>
        }
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

      <section aria-label="Ringkasan kohort" className="mb-5 grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
        {[
          { label: "Mahasiswa dipantau", value: preds.length, note: `${fmtInt(modules)} modul, data sampai minggu ke-4` },
          { label: "Kritis dan Tinggi", value: urgent, note: `${fmtPct(urgent / (preds.length || 1))} kohort, paling mendesak dihubungi` },
          { label: "Perkiraan benar-benar berisiko", value: expected, note: "jumlah semua peluang berisiko, dipakai untuk rencana kapasitas", tone: "blue" as const },
          { label: "Perlu dicek manual", value: uncertain, note: "peluangnya di zona tidak pasti, tinjau sebelum bertindak" },
        ].map((k, i) => (
          <div key={k.label} className="plate rise p-4 sm:p-5" style={{ "--i": i } as React.CSSProperties}>
            <Stat label={k.label} value={k.value} note={k.note} tone={k.tone} />
          </div>
        ))}
      </section>

      <PlanProof />

      <div className={manager ? "grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]" : undefined}>
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

        {manager && (
          <div className="rise flex flex-col gap-5" style={{ "--i": 3 } as React.CSSProperties}>
            <CapacityGlance cohortId={cohort.id} />
            {ece != null && (
              <p className="px-1 text-xs leading-relaxed text-ink-3">
                Peluang dari model terkalibrasi: rata-rata selisihnya dengan kejadian sebenarnya {fmtPct(ece, 1)} (ECE). Detail ada di halaman Model.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-5">
        {!manager && <CallFirst preds={flagged} />}
        <Section title="Empat tier risiko" description="Peluang dari model dibagi menjadi empat tier supaya jelas siapa yang dihubungi lebih dulu. Tier menentukan seberapa mendesak, archetype di bawah menentukan tindakannya.">
          <TierCards preds={preds} />
        </Section>

        <FollowUp preds={preds} contacts={contacts} />

        <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[3fr_2fr]">
          <Section title="Kenapa mereka berisiko" description="Setiap mahasiswa masuk satu pola perilaku (archetype), dan pola itu menentukan tindakan dari playbook. Terbukti berisiko adalah porsi yang memang berisiko di hasil akhir kohort uji DSCO. Klik baris untuk membuka daftarnya.">
            <ArchetypeTable preds={preds} />
          </Section>
          <Section title="Modul dengan risiko terbanyak" description="Jumlah mahasiswa ter-flag dan kritis per modul. Klik modul untuk membuka daftarnya.">
            <ModuleTable preds={preds} />
          </Section>
        </div>

        <Section title="Peta risiko per course" description="Rata-rata peluang berisiko per modul dan semester. Makin pekat warnanya, makin tinggi risikonya.">
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
      description="Sepuluh mahasiswa dengan peluang berisiko tertinggi di modul Anda."
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
          { id: "p", label: "Peluang berisiko", align: "end", cell: (p) => <span className="font-semibold">{fmtProb(p.probability)}</span> },
        ]}
      />
    </Section>
  );
}

const TIER_COPY: Record<string, { meaning: string; action: string }> = {
  critical: { meaning: "Peluang berisiko paling tinggi", action: "Hubungi lebih dulu, minggu ini juga" },
  high: { meaning: "Peluang tinggi, satu tingkat di bawah kritis", action: "Hubungi setelah semua yang kritis" },
  watch: { meaning: "Baru melewati ambang ter-flag", action: "Pantau, tindakannya mengikuti archetype" },
  low: { meaning: "Di bawah ambang ter-flag", action: "Tidak perlu intervensi, cukup dipantau" },
};

/** One card per tier, most urgent first: share, count, what the tier means, what to do, and its list. */
function TierCards({ preds }: { preds: PredictionLite[] }) {
  const total = preds.length || 1;
  const tiers = TIER_VALUES;
  const proven = landing.test?.tier_at_risk;
  return (
    <>
      <SegmentedBar
        ariaLabel="Sebaran tier risiko"
        segments={tiers.map((t) => ({
          key: t,
          label: TIER_LABELS[t],
          value: count(preds, (p) => p.tier === t),
          href: t === "low" ? undefined : `/prioritas?tier=${t}`,
          ...TIER_STYLE[t],
        }))}
      />
      <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiers.map((t, i) => {
          const group = preds.filter((p) => p.tier === t);
          const mean = group.length ? group.reduce((s, p) => s + p.probability, 0) / group.length : null;
          return (
            <li
              key={t}
              className="rise flex flex-col rounded-2xl border border-line bg-surface p-4 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md"
              style={{ "--i": i } as React.CSSProperties}
            >
              <div className="flex items-center justify-between gap-2">
                <TierBadge tier={t} />
                <span className="text-[13px] font-semibold text-ink-3 tabular-nums">{fmtPct(group.length / total)}</span>
              </div>
              <p className="mt-3">
                <Num value={group.length} className="numeral text-[2rem]" /> <span className="text-sm text-ink-3">mahasiswa</span>
              </p>
              <p className="mt-1 text-[13px] text-ink-3">{TIER_COPY[t].meaning}</p>
              {(mean != null || proven?.[t] != null) && (
                <dl className="mt-3 flex flex-col gap-1 rounded-lg bg-surface-secondary px-2.5 py-1.5 text-xs text-ink-2">
                  {mean != null && (
                    <div className="flex justify-between gap-2">
                      <dt>Rata-rata peluang berisiko</dt>
                      <dd className="font-semibold text-ink tabular-nums">{fmtProb(mean)}</dd>
                    </div>
                  )}
                  {proven?.[t] != null && (
                    <div className="flex justify-between gap-2">
                      <dt>Terbukti berisiko di kohort uji</dt>
                      <dd className="font-semibold text-ink tabular-nums">{fmtPct(proven[t])}</dd>
                    </div>
                  )}
                </dl>
              )}
              <p className="mt-3 text-sm font-semibold text-ink">{TIER_COPY[t].action}</p>
              {t !== "low" && (
                <ul className="mt-2 flex flex-1 flex-col gap-1.5 text-[13px]">
                  {topActions(group).map((r) => (
                    <li key={r.archetype} className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 text-ink-2">
                        {ACTION_LABELS[r.action] ?? r.action}
                        <span className="block text-xs text-ink-3">{ARCHETYPE_LABELS[r.archetype] ?? r.archetype}</span>
                      </span>
                      <span className="font-semibold text-ink tabular-nums">{fmtInt(r.n)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {t !== "low" && (
                <Link href={`/prioritas?tier=${t}`} className="mt-3 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-blue-ink hover:underline">
                  Lihat daftar <ArrowRight className="size-4" aria-hidden />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

/**
 * From prediction to action: of the students to call first (Kritis and Tinggi), how many already have a contact log
 * and how many were reached. Statuses come from the intervention log on the student profile.
 */
function FollowUp({ preds, contacts }: { preds: PredictionLite[]; contacts: Map<number, string> }) {
  const urgent = preds.filter((p) => p.tier === "critical" || p.tier === "high");
  const status = (s: string) => count(urgent, (p) => contacts.get(p.student_id) === s);
  const logged = count(urgent, (p) => contacts.has(p.student_id));
  const base = urgent.length || 1;
  const rows = [
    { label: "Perlu dihubungi lebih dulu", note: "Kritis dan Tinggi", value: urgent.length, bar: "bg-tier-high" },
    { label: "Sudah ada catatan kontak", note: "apa pun hasilnya", value: logged, bar: "bg-blue/60" },
    { label: CONTACT_STATUS_LABELS.contacted, note: "berhasil bicara dengan mahasiswa", value: status("contacted"), bar: "bg-blue" },
  ];
  return (
    <Section
      title={
        logged === 0
          ? `Belum ada kontak yang dicatat untuk ${fmtInt(urgent.length)} mahasiswa Kritis dan Tinggi.`
          : `${fmtInt(status("contacted"))} dari ${fmtInt(urgent.length)} mahasiswa Kritis dan Tinggi sudah berhasil dihubungi.`
      }
      description="Prediksi baru berguna kalau berujung kontak. Angka ini bertambah setiap kali konselor mencatat intervensi di profil mahasiswa."
      actions={
        <LinkButton href="/prioritas?tier=critical" variant="secondary" size="sm">
          Buka daftar Kritis
        </LinkButton>
      }
    >
      <ul className="flex flex-col gap-3.5">
        {rows.map((r) => (
          <li key={r.label} className="grid items-center gap-x-4 gap-y-1 sm:grid-cols-[220px_minmax(0,1fr)_72px]">
            <span className="text-sm text-ink-2">
              {r.label}
              <span className="block text-xs text-ink-3">{r.note}</span>
            </span>
            <span className="h-3 overflow-hidden rounded-full bg-queue-track">
              <span className={`grow-bar block h-full rounded-full ${r.bar}`} style={{ width: `${Math.max((r.value / base) * 100, r.value ? 1 : 0)}%` }} />
            </span>
            <span className="text-sm font-semibold text-ink tabular-nums sm:text-right">{fmtInt(r.value)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-ink-3">
        {CONTACT_STATUS_LABELS.scheduled}: {fmtInt(status("scheduled"))}. {CONTACT_STATUS_LABELS.unreachable}: {fmtInt(status("unreachable"))}, perlu dicoba lewat kanal lain.
      </p>
    </Section>
  );
}

/** The two most common archetypes in a group, with the playbook action each one carries. */
function topActions(group: PredictionLite[]) {
  const by = new Map<string, { archetype: string; action: string; n: number }>();
  for (const p of group) {
    const row = by.get(p.archetype) ?? { archetype: p.archetype, action: p.recommended_action, n: 0 };
    row.n += 1;
    by.set(p.archetype, row);
  }
  return [...by.values()].sort((a, b) => b.n - a.n).slice(0, 2);
}

/**
 * The prescriptive proof: the counsellor plan on the DSCO test cohort, checked against final outcomes,
 * next to the hit count a random pick of the same size would expect.
 */
function PlanProof() {
  const test = landing.test;
  if (!test) return null;
  const random = (test.plan_contacted * test.at_risk) / test.n;
  const rows = [
    { label: "Dipilih Lentera", value: test.plan_at_risk, bar: "bg-blue", ink: "text-blue" },
    { label: "Kalau dipilih acak", value: random, bar: "bg-line-strong", ink: "text-ink-2" },
  ];
  return (
    <section aria-labelledby="bukti-rencana" className="plate rise mb-5 grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center" style={{ "--i": 4 } as React.CSSProperties}>
      <div>
        <h2 id="bukti-rencana" className="text-[17px] font-semibold tracking-[-0.01em] text-ink">
          Rencana kontak ini sudah dicek dengan hasil akhir.
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">
          Di kohort uji DSCO, {landing.plan.advisors} konselor dengan {landing.plan.hours} jam per minggu menelepon {fmtInt(test.plan_contacted)} mahasiswa
          pilihan Lentera. Setelah status akhir semester keluar, <b className="font-semibold text-ink">{fmtInt(test.plan_at_risk)} di antaranya memang berisiko</b>.
          Lentera memperkirakan {fmtInt(test.plan_expected)} sebelum hasilnya keluar, jadi angka di rencana kapasitas bisa dipegang.
        </p>
        <p className="mt-4 flex items-baseline gap-3">
          <span className="numeral text-[2.6rem] text-blue">{fmtNum(test.plan_at_risk / random, 1)}&times;</span>
          <span className="text-sm leading-snug text-ink-3">lebih banyak mahasiswa berisiko per jam konselor dibanding memilih acak</span>
        </p>
      </div>
      <figure>
        <figcaption className="mb-3 text-[13px] font-semibold text-ink-3">
          Mahasiswa yang memang berisiko dari {fmtInt(test.plan_contacted)} yang ditelepon
        </figcaption>
        <ul className="flex flex-col gap-4">
          {rows.map((r) => (
            <li key={r.label}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-ink-2">{r.label}</span>
                <span className={`font-semibold tabular-nums ${r.ink}`}>
                  {fmtInt(r.value)} <span className="font-normal text-ink-3">({fmtPct(r.value / test.plan_contacted)})</span>
                </span>
              </div>
              <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-queue-track">
                <div className={`grow-bar h-full rounded-full ${r.bar}`} style={{ width: `${(r.value / test.plan_contacted) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink-3">
          Ambang dan rencana ditetapkan sebelum status akhir dipakai. Pilihan acak memakai porsi berisiko kohort, {fmtPct(test.at_risk / test.n)}.
        </p>
      </figure>
    </section>
  );
}

function count(preds: PredictionLite[], fn: (p: PredictionLite) => boolean) {
  return preds.reduce((n, p) => n + (fn(p) ? 1 : 0), 0);
}

function ArchetypeTable({ preds }: { preds: PredictionLite[] }) {
  const proven = landing.test?.archetype_at_risk;
  const rows = ARCHETYPE_VALUES.map((a) => {
    const group = preds.filter((p) => p.archetype === a);
    return {
      a,
      proven: proven?.[a],
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
        { id: "m", label: "Rata-rata peluang", align: "end", cell: (r) => fmtProb(r.mean) },
        ...(proven
          ? [{ id: "p", label: "Terbukti berisiko", align: "end" as const, cell: (r: (typeof rows)[number]) => (r.proven == null ? "-" : fmtPct(r.proven)) }]
          : []),
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
  return <HeatmapTable rows={rows} cols={cols} cells={cells} format={(v) => fmtPct(v)} label="rata-rata peluang berisiko" />;
}
