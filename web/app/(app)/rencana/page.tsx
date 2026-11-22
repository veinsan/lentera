import type { Metadata } from "next";
import { Suspense } from "react";
import { ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/domain/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { RoleGate } from "@/components/layout/role-gate";

export const metadata: Metadata = { title: "Rencana Intervensi" };

export default function Page() {
  return (
    <>
      <PageHeader title="Rencana Intervensi" description="Alokasikan intervensi sesuai kapasitas konselor dan lihat jumlah mahasiswa berisiko yang terjangkau." />
      <Suspense fallback={null}>
        <RoleGate roles={["coordinator", "admin"]}>
          <EmptyState
            icon={ClipboardList}
            title="Belum ada kohort untuk direncanakan"
            description="Rencana intervensi dihitung dari kohort yang sudah dinilai."
            action={{ href: "/unggah", label: "Unggah kohort" }}
          />
        </RoleGate>
      </Suspense>
    </>
  );
}
