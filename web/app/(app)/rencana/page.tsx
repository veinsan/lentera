import type { Metadata } from "next";
import { Suspense } from "react";
import { ClipboardList } from "lucide-react";
import { CapacityPlanner } from "@/components/domain/capacity-planner";
import { EmptyState } from "@/components/domain/empty-state";
import { Section } from "@/components/domain/section";
import { PageHeader } from "@/components/layout/page-header";
import { RoleGate } from "@/components/layout/role-gate";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PlanResult } from "@/lib/api";
import { getLatestCohort } from "@/lib/data";
import { fmtInt, fmtPct } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Rencana Intervensi" };

export default function Page() {
  return (
    <Suspense fallback={<PageHeader title="Rencana Intervensi" description="Memuat kohort..." />}>
      <RoleGate roles={["coordinator", "admin"]}>
        <PlannerContent />
      </RoleGate>
    </Suspense>
  );
}

async function PlannerContent() {
  const cohort = await getLatestCohort();
  if (!cohort) {
    return (
      <>
        <PageHeader title="Rencana Intervensi" description="Alokasikan intervensi sesuai kapasitas konselor." />
        <EmptyState
          icon={ClipboardList}
          title="Belum ada kohort untuk direncanakan"
          description="Rencana intervensi dihitung dari kohort yang sudah dinilai."
          action={{ href: "/unggah", label: "Unggah kohort" }}
        />
      </>
    );
  }
  return (
    <>
      <PageHeader
        title="Setiap jam konselor dihitung sebagai mahasiswa berisiko yang terjangkau."
        description={`${cohort.name} · berapa mahasiswa berisiko yang terjangkau dengan kapasitas konselor yang ada.`}
      />
      <div className="flex flex-col gap-6">
        <CapacityPlanner cohortId={cohort.id} />
        <Section title="Rencana tersimpan">
          <SavedPlans cohortId={cohort.id} />
        </Section>
      </div>
    </>
  );
}

async function SavedPlans({ cohortId }: { cohortId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("plans")
    .select("id, created_at, params, result")
    .eq("cohort_id", cohortId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (!data?.length) return <p className="text-sm text-muted-foreground">Belum ada rencana tersimpan.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>#</TableHead>
          <TableHead>Disimpan</TableHead>
          <TableHead className="text-right">Konselor x jam</TableHead>
          <TableHead className="text-right">Dihubungi konselor</TableHead>
          <TableHead className="text-right">Berisiko terjangkau</TableHead>
          <TableHead className="text-right">Cakupan</TableHead>
          <TableHead>Asumsi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((p) => {
          const s = (p.result as PlanResult).summary;
          const params = p.params as { advisors: number; hours_per_advisor: number };
          return (
            <TableRow key={p.id}>
              <TableCell className="font-mono">{p.id}</TableCell>
              <TableCell>
                {new Date(p.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {params.advisors} x {params.hours_per_advisor}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">{fmtInt(s.advisor_contacts)}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">{fmtInt(s.expected_at_risk_reached_advisor)}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">{fmtPct(s.advisor_coverage, 1)}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{s.is_scenario ? "Efektivitas disesuaikan" : "Default"}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
