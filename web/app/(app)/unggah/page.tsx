import type { Metadata } from "next";
import { Suspense } from "react";
import { Section } from "@/components/domain/section";
import { OutcomeUpload } from "@/components/domain/outcome-upload";
import { UploadFlow } from "@/components/domain/upload-flow";
import { PageHeader } from "@/components/layout/page-header";
import { RoleGate } from "@/components/layout/role-gate";
import { DataTable } from "@/components/ui/data-table";
import { getLatestCohort } from "@/lib/data";
import { fmtInt } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Unggah kohort" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Data minggu ke-4 diperiksa dulu, baru dinilai."
        description="Unggah CSV minggu ke-4 dengan skema test.csv DSCO, periksa kualitas data, lalu nilai kohort."
      />
      <Suspense fallback={<div className="plate h-48 animate-pulse" aria-label="Memuat" />}>
        <RoleGate roles={["coordinator", "admin"]}>
          <div className="flex flex-col gap-5">
            <Section
              title="Unggah dan periksa"
              description="Sebelum model menilai, sistem memeriksa kolom wajib, tipe data, ID ganda, label yang diperbaiki otomatis, dan blok aktivitas placeholder."
            >
              <UploadFlow />
            </Section>
            <LatestOutcomeUpload />
            <Section title="Kohort tersimpan" description="Kohort terbaru menjadi tampilan default di X-Ray dan daftar prioritas.">
              <CohortList />
            </Section>
          </div>
        </RoleGate>
      </Suspense>
    </>
  );
}

async function LatestOutcomeUpload() {
  const cohort = await getLatestCohort();
  if (!cohort) return null;
  return (
    <Section
      title="Cek prediksi dengan hasil akhir"
      description="Setelah semester selesai, unggah hasil akhir kohort terbaru. Lentera menghitung F1, kalibrasi, dan apakah rencana kontak menjangkau mahasiswa yang benar-benar berisiko."
    >
      <OutcomeUpload cohortId={cohort.id} cohortName={cohort.name} />
    </Section>
  );
}

async function CohortList() {
  const supabase = await createClient();
  const { data: cohorts } = await supabase
    .from("cohorts")
    .select("id, name, uploaded_at, n_rows, model_version, status")
    .order("uploaded_at", { ascending: false });
  if (!cohorts?.length) return <p className="text-sm text-ink-3">Belum ada kohort.</p>;
  return (
    <DataTable
      label="Kohort tersimpan"
      rows={cohorts}
      rowId={(c) => c.id}
      columns={[
        { id: "name", label: "Nama", rowHeader: true, cell: (c) => <span className="font-semibold">{c.name}</span> },
        {
          id: "at",
          label: "Diunggah",
          cell: (c) => new Date(c.uploaded_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }),
        },
        { id: "n", label: "Mahasiswa", align: "end", cell: (c) => fmtInt(c.n_rows) },
        { id: "v", label: "Versi model", cell: (c) => <span className="font-mono text-xs text-ink-2">{c.model_version}</span> },
      ]}
    />
  );
}
