import type { Metadata } from "next";
import { Suspense } from "react";
import { Section } from "@/components/domain/section";
import { UploadFlow } from "@/components/domain/upload-flow";
import { PageHeader } from "@/components/layout/page-header";
import { RoleGate } from "@/components/layout/role-gate";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtInt } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Unggah Kohort" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Data minggu ke-4 diperiksa dulu, baru dinilai."
        description="Unggah CSV minggu ke-4 dengan skema test.csv DSCO, periksa kualitas data, lalu nilai kohort."
      />
      <Suspense fallback={null}>
        <RoleGate roles={["coordinator", "admin"]}>
          <div className="flex flex-col gap-6">
            <Section
              title="Unggah dan periksa"
              description="Pemeriksaan berjalan sebelum model menilai: kolom wajib, tipe data, id ganda, label yang diperbaiki otomatis, dan blok aktivitas placeholder."
            >
              <UploadFlow />
            </Section>
            <Section title="Kohort tersimpan">
              <CohortList />
            </Section>
          </div>
        </RoleGate>
      </Suspense>
    </>
  );
}

async function CohortList() {
  const supabase = await createClient();
  const { data: cohorts } = await supabase
    .from("cohorts")
    .select("id, name, uploaded_at, n_rows, model_version, status")
    .order("uploaded_at", { ascending: false });
  if (!cohorts?.length) return <p className="text-sm text-muted-foreground">Belum ada kohort.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nama</TableHead>
          <TableHead>Diunggah</TableHead>
          <TableHead className="text-right">Mahasiswa</TableHead>
          <TableHead>Versi model</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cohorts.map((c) => (
          <TableRow key={c.id}>
            <TableCell className="font-medium">{c.name}</TableCell>
            <TableCell>
              {new Date(c.uploaded_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">{fmtInt(c.n_rows)}</TableCell>
            <TableCell className="font-mono text-xs">{c.model_version}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
