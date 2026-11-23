import type { Metadata } from "next";
import { Suspense } from "react";
import { CapacityPlanner } from "@/components/domain/capacity-planner";
import { EmptyState } from "@/components/domain/empty-state";
import { Section } from "@/components/domain/section";
import { PageHeader } from "@/components/layout/page-header";
import { RoleGate } from "@/components/layout/role-gate";
import { DataTable } from "@/components/ui/data-table";
import { getModelCard, type PlanResult } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getLatestCohort } from "@/lib/data";
import { fmtInt, fmtPct } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Rencana intervensi" };

export default function Page() {
  return (
    <Suspense fallback={<PageHeader title="Menghitung kapasitas konselor..." />}>
      <RoleGate roles={["coordinator", "admin"]}>
        <PlannerContent />
      </RoleGate>
    </Suspense>
  );
}

async function PlannerContent() {
  const [user, cohort] = await Promise.all([getCurrentUser(), getLatestCohort()]);
  if (!cohort) {
    return (
      <>
        <PageHeader title="Belum ada kohort untuk direncanakan." />
        <EmptyState
          title="Rencana menunggu kohort"
          description="Rencana intervensi dihitung dari kohort minggu ke-4 yang sudah dinilai."
          action={{ href: "/unggah", label: "Unggah kohort" }}
        />
      </>
    );
  }
  const card = await getModelCard(user.accessToken);
  return (
    <>
      <PageHeader
        title="Setiap jam konselor dihitung sebagai mahasiswa berisiko yang terjangkau."
        description={`${cohort.name}. Ubah kapasitas dan asumsi playbook; papan, kurva, dan alokasi dihitung ulang langsung.`}
      />
      <div className="flex flex-col gap-5">
        <CapacityPlanner cohortId={cohort.id} ece={card.ok ? card.data.calibration.ece : null} />
        <Section title="Rencana tersimpan" description="Sepuluh rencana terakhir untuk kohort ini.">
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
  if (!data?.length) return <p className="text-sm text-ink-3">Belum ada rencana tersimpan. Simpan rencana di atas untuk membandingkannya nanti.</p>;
  const rows = data.map((p) => ({
    id: p.id as number,
    at: new Date(p.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }),
    params: p.params as { advisors: number; hours_per_advisor: number },
    s: (p.result as PlanResult).summary,
  }));
  return (
    <DataTable
      label="Rencana tersimpan"
      rows={rows}
      rowId={(r) => r.id}
      columns={[
        { id: "id", label: "#", rowHeader: true, cell: (r) => <span className="font-mono font-semibold">{r.id}</span> },
        { id: "at", label: "Disimpan", cell: (r) => r.at },
        { id: "cap", label: "Konselor × jam", align: "end", cell: (r) => `${r.params.advisors} × ${r.params.hours_per_advisor}` },
        { id: "c", label: "Dihubungi konselor", align: "end", cell: (r) => fmtInt(r.s.advisor_contacts) },
        { id: "r", label: "Berisiko terjangkau", align: "end", cell: (r) => <span className="font-semibold">{fmtInt(r.s.expected_at_risk_reached_advisor)}</span> },
        { id: "cov", label: "Cakupan", align: "end", cell: (r) => fmtPct(r.s.advisor_coverage, 1) },
        { id: "as", label: "Asumsi", cell: (r) => <span className="text-ink-3">{r.s.is_scenario ? "Efektivitas disesuaikan" : "Default"}</span> },
      ]}
    />
  );
}
