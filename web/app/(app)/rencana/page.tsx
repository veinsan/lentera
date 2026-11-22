import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/domain/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Rencana Intervensi" };

export default function Page() {
  return (
    <>
      <PageHeader title="Rencana Intervensi" description="Alokasikan intervensi sesuai kapasitas konselor dan lihat jumlah mahasiswa berisiko yang terjangkau." />
      <EmptyState
        icon={ClipboardList}
        title="Belum ada kohort untuk direncanakan"
        description="Rencana intervensi dihitung dari kohort yang sudah dinilai."
        action={{ href: "/unggah", label: "Unggah kohort" }}
      />
    </>
  );
}
