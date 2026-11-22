import type { Metadata } from "next";
import { Upload } from "lucide-react";
import { EmptyState } from "@/components/domain/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Unggah Kohort" };

export default function Page() {
  return (
    <>
      <PageHeader title="Unggah Kohort" description="Unggah CSV minggu ke-4 dengan skema test.csv DSCO, periksa kualitas data, lalu nilai kohort." />
      <EmptyState
        icon={Upload}
        title="Formulir unggah belum tersedia"
        description="Formulir unggah dan laporan kualitas data ditampilkan di sini."
      />
    </>
  );
}
