import type { Metadata } from "next";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { StudentProfileView } from "@/components/domain/student-profile";
import { LinkButton } from "@/components/ui/link-button";

export const metadata: Metadata = {
  title: "Profil mahasiswa",
  description: "Alasan risiko seorang mahasiswa, skenario perubahan perilaku, template pesan, dan riwayat kontak konselor.",
};

/** The full page for a direct link or a refresh; from the worklist the same view opens as a side panel. */
export default function Page({ params }: PageProps<"/mahasiswa/[id]">) {
  return (
    <>
      <div className="mb-5">
        <LinkButton href="/prioritas" variant="ghost" className="-ml-3">
          <ArrowLeft aria-hidden /> Daftar prioritas
        </LinkButton>
      </div>
      <Suspense fallback={<div className="plate h-48 animate-pulse" aria-label="Memuat profil" />}>
        <Profile params={params} />
      </Suspense>
    </>
  );
}

async function Profile({ params }: Pick<PageProps<"/mahasiswa/[id]">, "params">) {
  const { id } = await params;
  return <StudentProfileView id={id} />;
}
