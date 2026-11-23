import { Suspense } from "react";
import { StudentPanel } from "@/components/domain/student-panel";
import { StudentProfileView } from "@/components/domain/student-profile";

/** Opening a student from inside the app keeps the current page and slides the profile in from the right. */
export default function InterceptedStudent({ params }: PageProps<"/mahasiswa/[id]">) {
  return (
    <Suspense fallback={null}>
      <Panel params={params} />
    </Suspense>
  );
}

async function Panel({ params }: Pick<PageProps<"/mahasiswa/[id]">, "params">) {
  const { id } = await params;
  return (
    <StudentPanel id={id}>
      <Suspense fallback={<div className="plate h-64 animate-pulse" aria-label="Memuat profil" />}>
        <StudentProfileView id={id} panel />
      </Suspense>
    </StudentPanel>
  );
}
