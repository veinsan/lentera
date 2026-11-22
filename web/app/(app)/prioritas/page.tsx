import type { Metadata } from "next";
import { ListOrdered } from "lucide-react";
import { EmptyState } from "@/components/domain/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Daftar Prioritas" };

export default function Page() {
  return (
    <>
      <PageHeader title="Daftar Prioritas" description="Mahasiswa ter-flag di modul Anda, diurutkan dari probabilitas tertinggi." />
      <EmptyState
        icon={ListOrdered}
        title="Belum ada mahasiswa ter-flag"
        description="Daftar prioritas muncul setelah kohort minggu ke-4 dinilai."
        action={{ href: "/unggah", label: "Unggah kohort" }}
      />
    </>
  );
}
