import type { Metadata } from "next";
import { Suspense } from "react";
import { UserRound } from "lucide-react";
import { EmptyState } from "@/components/domain/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Profil Mahasiswa" };

export default function Page({ params }: PageProps<"/mahasiswa/[id]">) {
  return (
    // params resolve at request time; the header streams in after the static shell.
    <Suspense fallback={<PageHeader title="Profil Mahasiswa" description="Memuat..." />}>
      <StudentProfile params={params} />
    </Suspense>
  );
}

async function StudentProfile({ params }: Pick<PageProps<"/mahasiswa/[id]">, "params">) {
  const { id } = await params;
  return (
    <>
      <PageHeader title="Profil Mahasiswa" description={`ID mahasiswa ${id}`} />
      <EmptyState
        icon={UserRound}
        title="Profil belum tersedia"
        description="Alasan risiko, skenario, dan riwayat intervensi ditampilkan di sini."
      />
    </>
  );
}
