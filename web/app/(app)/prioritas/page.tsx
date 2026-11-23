import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ArchetypeChip } from "@/components/domain/archetype-chip";
import { ContactMark } from "@/components/domain/contact-mark";
import { EmptyState } from "@/components/domain/empty-state";
import { StoppedFlag } from "@/components/domain/stopped-flag";
import { TierBadge } from "@/components/domain/tier-badge";
import { WorklistFiltersBar } from "@/components/domain/worklist-filters";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { getCurrentUser } from "@/lib/auth";
import { getLatestCohort, getWorklist, topReasons, WORKLIST_PAGE, type WorklistRow } from "@/lib/data";
import { fmtInt, fmtModule, fmtProb } from "@/lib/format";
import { ACTION_LABELS, ARCHETYPE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { parseWorklistParams, toQuery, type WorklistFilters } from "@/lib/worklist-params";
import { TIER_LABELS } from "@/components/domain/tier-badge";

export const metadata: Metadata = { title: "Daftar prioritas" };

const ALL_MODULES = ["m01", "m02", "m03", "m04", "m05", "m06", "m07"];

export default function Page({ searchParams }: PageProps<"/prioritas">) {
  return (
    <Suspense fallback={<PageHeader title="Menyusun daftar prioritas..." />}>
      <Worklist searchParams={searchParams} />
    </Suspense>
  );
}

function filterWords(f: WorklistFilters) {
  return [
    f.tier && `tier ${TIER_LABELS[f.tier]}`,
    f.archetype && ARCHETYPE_LABELS[f.archetype],
    f.module && fmtModule(f.module),
    f.status === "belum" && "belum dihubungi",
    f.status === "sudah" && "sudah ada catatan",
  ].filter(Boolean) as string[];
}

async function Worklist({ searchParams }: Pick<PageProps<"/prioritas">, "searchParams">) {
  const [{ filters, page }, user, cohort] = await Promise.all([
    searchParams.then(parseWorklistParams),
    getCurrentUser(),
    getLatestCohort(),
  ]);
  if (!cohort) {
    return (
      <>
        <PageHeader title="Belum ada mahasiswa ter-flag." />
        <EmptyState title="Daftar prioritas masih kosong" description="Daftar prioritas muncul setelah kohort minggu ke-4 dinilai." />
      </>
    );
  }

  const { rows, total, status } = await getWorklist(cohort.id, filters, page - 1);
  const pages = Math.max(1, Math.ceil(total / WORKLIST_PAGE));
  const offset = (page - 1) * WORKLIST_PAGE;
  const modules = user.role === "admin" ? ALL_MODULES : user.modules;
  const words = filterWords(filters);
  const contacted = rows.filter((r) => status.has(r.student_id)).length;

  return (
    <>
      <PageHeader
        title={
          words.length ? (
            <>
              {fmtInt(total)} mahasiswa {words.join(", ")}, diurutkan dari probabilitas tertinggi.
            </>
          ) : (
            <>Hubungi {fmtInt(total)} mahasiswa ter&#8209;flag dari atas, diurutkan menurut probabilitas terkalibrasi.</>
          )
        }
        description={`${cohort.name}. Klik baris untuk membuka alasan, tindakan, dan skenario mahasiswa tanpa meninggalkan daftar.`}
      />
      <div className="plate rise flex flex-col gap-5 p-5 sm:p-6" style={{ "--i": 1 } as React.CSSProperties}>
        <WorklistFiltersBar filters={filters} modules={modules} />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-separator pt-4 text-sm text-ink-3">
          <p>
            {total > 0 ? (
              <>
                Menampilkan <b className="font-semibold text-ink tabular-nums">{fmtInt(offset + 1)}</b> sampai{" "}
                <b className="font-semibold text-ink tabular-nums">{fmtInt(offset + rows.length)}</b> dari{" "}
                <b className="font-semibold text-ink tabular-nums">{fmtInt(total)}</b>
              </>
            ) : (
              "Tidak ada mahasiswa yang cocok."
            )}
          </p>
          {rows.length > 0 && (
            <div className="flex items-center gap-3" aria-label="Kemajuan kontak di halaman ini">
              <span>
                <b className="font-semibold text-ink tabular-nums">{fmtInt(contacted)}</b> dari {fmtInt(rows.length)} di halaman ini sudah ada catatan
              </span>
              <span className="h-1.5 w-28 overflow-hidden rounded-full bg-default">
                <span className="block h-full rounded-full bg-success" style={{ width: `${(contacted / rows.length) * 100}%` }} />
              </span>
            </div>
          )}
        </div>
        {rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-ink-3">Ubah atau reset filter untuk melihat mahasiswa lain.</p>
        ) : (
          <DataTable
            label="Daftar prioritas mahasiswa"
            rows={rows.map((r, i) => ({ ...r, rank: offset + i + 1 }))}
            rowId={(r) => r.student_id}
            rowHref={(r) => `/mahasiswa/${r.student_id}`}
            columns={[
              { id: "rank", label: "#", align: "end", className: "w-12 text-ink-3", cell: (r) => r.rank },
              {
                id: "student",
                label: "Mahasiswa",
                rowHeader: true,
                cell: (r) => (
                  <div>
                    <span className="font-mono text-[14px] font-semibold text-ink">{r.students.source_id}</span>
                    <span className="block text-xs text-ink-3">
                      {fmtModule(r.code_module)}, {fmtModule(r.students.code_presentation)}
                    </span>
                    <span className="mt-1.5 block">
                      <ArchetypeChip archetype={r.archetype} />
                    </span>
                    <StoppedFlag id={r.student_id} />
                  </div>
                ),
              },
              // Paired cells (student with archetype, probability with tier, action with contact status) keep every column in view on a projector.
              {
                id: "risk",
                label: "Risiko",
                cell: (r) => (
                  <div className="flex flex-col items-start gap-1.5">
                    <Probability row={r} />
                    <TierBadge tier={r.tier} />
                  </div>
                ),
              },
              { id: "why", label: "Alasan utama", className: "min-w-[240px] max-w-sm whitespace-normal", cell: (r) => <Reasons row={r} /> },
              {
                id: "act",
                label: "Tindakan dan status",
                className: "min-w-[176px] whitespace-normal",
                cell: (r) => (
                  <div className="flex flex-col items-start gap-1.5">
                    <span className="text-[13px] font-medium text-ink-2">{ACTION_LABELS[r.recommended_action] ?? r.recommended_action}</span>
                    <ContactMark status={status.get(r.student_id)} />
                  </div>
                ),
              },
            ]}
          />
        )}
        {pages > 1 && (
          <nav aria-label="Halaman daftar" className="flex items-center justify-between gap-3 text-sm">
            <span className="text-ink-3">
              Halaman <b className="font-semibold text-ink">{page}</b> dari {pages}
            </span>
            <div className="flex gap-2">
              <PageLink href={`/prioritas${toQuery(filters, page - 1)}`} disabled={page <= 1} label="Sebelumnya" dir="prev" />
              <PageLink href={`/prioritas${toQuery(filters, page + 1)}`} disabled={page >= pages} label="Berikutnya" dir="next" />
            </div>
          </nav>
        )}
      </div>
    </>
  );
}

function Probability({ row }: { row: WorklistRow }) {
  return (
    <span
      className={cn("font-semibold text-ink tabular-nums", row.uncertain && "rounded-md border border-dashed border-uncertain px-1.5 py-0.5")}
      title={row.uncertain ? "Zona tidak pasti, tinjau lewat percakapan sebelum bertindak" : undefined}
    >
      {fmtProb(row.probability)}
      {row.uncertain && <span className="sr-only"> (zona tidak pasti)</span>}
    </span>
  );
}

function Reasons({ row }: { row: WorklistRow }) {
  const reasons = topReasons(row.actionable);
  if (!reasons.length) return <span className="text-[13px] text-ink-3">Tidak ada sinyal aktivitas yang menaikkan risiko</span>;
  return (
    <ul className="space-y-0.5 text-[13px] leading-snug text-ink-2">
      {reasons.map((x) => (
        <li key={x.signal}>{x.text}</li>
      ))}
    </ul>
  );
}

function PageLink({ href, disabled, label, dir }: { href: string; disabled: boolean; label: string; dir: "prev" | "next" }) {
  const cls = "inline-flex h-10 items-center gap-1.5 rounded-full border border-line-strong px-4 font-medium";
  const body =
    dir === "prev" ? (
      <>
        <ChevronLeft className="size-4" aria-hidden /> {label}
      </>
    ) : (
      <>
        {label} <ChevronRight className="size-4" aria-hidden />
      </>
    );
  if (disabled)
    return (
      <span aria-disabled className={cn(cls, "text-ink-3 opacity-50")}>
        {body}
      </span>
    );
  return (
    <Link href={href} className={cn(cls, "text-ink transition-colors hover:bg-surface-secondary")}>
      {body}
    </Link>
  );
}
