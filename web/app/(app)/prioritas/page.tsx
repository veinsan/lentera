import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ListOrdered } from "lucide-react";
import { ArchetypeChip } from "@/components/domain/archetype-chip";
import { EmptyState } from "@/components/domain/empty-state";
import { TierBadge } from "@/components/domain/tier-badge";
import { WorklistFiltersBar } from "@/components/domain/worklist-filters";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser } from "@/lib/auth";
import { getLatestCohort, getWorklist, topReasons, WORKLIST_PAGE } from "@/lib/data";
import { fmtInt, fmtModule, fmtProb } from "@/lib/format";
import { ACTION_LABELS, CONTACT_STATUS_LABELS, NOT_CONTACTED } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { parseWorklistParams, toQuery } from "@/lib/worklist-params";

export const metadata: Metadata = { title: "Daftar Prioritas" };

const ALL_MODULES = ["m01", "m02", "m03", "m04", "m05", "m06", "m07"];

export default function Page({ searchParams }: PageProps<"/prioritas">) {
  return (
    <Suspense fallback={<PageHeader title="Daftar Prioritas" description="Memuat daftar..." />}>
      <Worklist searchParams={searchParams} />
    </Suspense>
  );
}

async function Worklist({ searchParams }: Pick<PageProps<"/prioritas">, "searchParams">) {
  const [{ filters, page }, user, cohort] = await Promise.all([
    searchParams.then(parseWorklistParams),
    getCurrentUser(),
    getLatestCohort(),
  ]);
  const header = (
    <PageHeader
      title="Hubungi dari atas: urutannya mengikuti probabilitas terkalibrasi."
      description={
        cohort
          ? `Mahasiswa ter-flag di ${cohort.name}, diurutkan dari probabilitas tertinggi.`
          : "Mahasiswa ter-flag di modul Anda, diurutkan dari probabilitas tertinggi."
      }
    />
  );
  if (!cohort) {
    return (
      <>
        {header}
        <EmptyState icon={ListOrdered} title="Belum ada mahasiswa ter-flag" description="Daftar prioritas muncul setelah kohort minggu ke-4 dinilai." />
      </>
    );
  }

  const { rows, total, status } = await getWorklist(cohort.id, filters, page - 1);
  const pages = Math.max(1, Math.ceil(total / WORKLIST_PAGE));
  const offset = (page - 1) * WORKLIST_PAGE;
  const modules = user.role === "admin" ? ALL_MODULES : user.modules;

  return (
    <>
      {header}
      <div className="sheet flex flex-col gap-4 p-6">
        <WorklistFiltersBar filters={filters} modules={modules} />
        <p className="text-sm text-muted-foreground">
          {fmtInt(total)} mahasiswa ter-flag{total > 0 && `, menampilkan ${fmtInt(offset + 1)} sampai ${fmtInt(offset + rows.length)}`}.
        </p>
        {rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Tidak ada mahasiswa yang cocok dengan filter ini.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-right">#</TableHead>
                <TableHead>Mahasiswa</TableHead>
                <TableHead className="text-right">Prob.</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Archetype</TableHead>
                <TableHead>Alasan utama</TableHead>
                <TableHead>Tindakan</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => {
                const reasons = topReasons(r.actionable);
                const contact = status.get(r.student_id);
                return (
                  <TableRow key={r.student_id}>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">{offset + i + 1}</TableCell>
                    <TableCell>
                      <Link href={`/mahasiswa/${r.student_id}`} className="font-mono font-medium hover:underline">
                        {r.students.source_id}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        {fmtModule(r.code_module)} {fmtModule(r.students.code_presentation)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn("font-mono tabular-nums", r.uncertain && "rounded-sm border border-dashed border-uncertain px-1")}
                        title={r.uncertain ? "Zona tidak pasti (0,25 sampai 0,55)" : undefined}
                      >
                        {fmtProb(r.probability)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <TierBadge tier={r.tier} />
                    </TableCell>
                    <TableCell>
                      <ArchetypeChip archetype={r.archetype} />
                    </TableCell>
                    <TableCell className="max-w-xs whitespace-normal text-xs">
                      {reasons.length ? (
                        <ul className="space-y-0.5">
                          {reasons.map((x) => (
                            <li key={x.signal}>{x.text}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-muted-foreground">Tidak ada sinyal aktivitas yang menaikkan risiko</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{ACTION_LABELS[r.recommended_action] ?? r.recommended_action}</TableCell>
                    <TableCell className={cn("text-xs", !contact && "text-muted-foreground")}>
                      {contact ? CONTACT_STATUS_LABELS[contact] ?? contact : NOT_CONTACTED}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        {pages > 1 && (
          <nav aria-label="Halaman" className="flex items-center justify-end gap-2 text-sm">
            <span className="mr-2 text-muted-foreground">
              Halaman {page} dari {pages}
            </span>
            <PageLink href={`/prioritas${toQuery(filters, page - 1)}`} disabled={page <= 1} label="Sebelumnya" />
            <PageLink href={`/prioritas${toQuery(filters, page + 1)}`} disabled={page >= pages} label="Berikutnya" />
          </nav>
        )}
      </div>
    </>
  );
}

function PageLink({ href, disabled, label }: { href: string; disabled: boolean; label: string }) {
  if (disabled)
    return (
      <span aria-disabled className={buttonVariants({ variant: "outline", size: "sm", className: "pointer-events-none opacity-50" })}>
        {label}
      </span>
    );
  return (
    <Link href={href} className={buttonVariants({ variant: "outline", size: "sm" })}>
      {label}
    </Link>
  );
}
