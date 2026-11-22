import type { Metadata } from "next";
import { Lightbulb } from "lucide-react";
import { EmptyState } from "@/components/domain/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Insight Course" };

export default function Page() {
  return (
    <>
      <PageHeader title="Insight Course" description="Rekomendasi desain course per modul berdasarkan data pelatihan dan keandalan model." />
      <EmptyState
        icon={Lightbulb}
        title="Insight belum dimuat"
        description="Metrik dan rekomendasi per modul ditampilkan di sini."
      />
    </>
  );
}
