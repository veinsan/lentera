import type { Metadata } from "next";
import { Activity } from "lucide-react";
import { EmptyState } from "@/components/domain/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Model & Monitoring" };

export default function Page() {
  return (
    <>
      <PageHeader title="Model & Monitoring" description="Validasi, kalibrasi, fairness, drift, dan kesehatan API model." />
      <EmptyState
        icon={Activity}
        title="Model card belum dimuat"
        description="Hasil validasi bertingkat, kalibrasi, dan fairness ditampilkan di sini."
      />
    </>
  );
}
