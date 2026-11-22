import type { Metadata } from "next";
import { Upload } from "lucide-react";
import { EmptyState } from "@/components/domain/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Dashboard" };

export default function Page() {
  return (
    <>
      <PageHeader title="Dashboard" description="Ringkasan risiko kohort pada cutoff minggu ke-4." />
      <EmptyState
        icon={Upload}
        title="Belum ada kohort yang dinilai"
        description="Unggah ekspor data minggu ke-4 untuk melihat tier risiko, archetype, dan peta risiko per course."
        action={{ href: "/unggah", label: "Unggah kohort" }}
      />
    </>
  );
}
