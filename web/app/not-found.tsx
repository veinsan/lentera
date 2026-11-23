import Image from "next/image";
import { Wordmark } from "@/components/brand/lantern-mark";
import { LinkButton } from "@/components/ui/link-button";

export default function NotFound() {
  return (
    <main className="grid min-h-[100svh] place-items-center bg-paper px-6 py-16 text-center">
      <div className="flex max-w-md flex-col items-center">
        <Wordmark star="var(--blue)" className="text-ink" />
        <Image src="/illustrations/missing-star.svg" alt="" width={320} height={200} className="mt-10 h-auto w-[280px]" priority />
        <h1 className="display mt-8 text-[2rem] text-ink">Bintang ini tidak ada di peta.</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          Halaman atau mahasiswa yang Anda cari tidak ditemukan, atau berada di luar modul yang boleh Anda lihat.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <LinkButton href="/dashboard">Buka X-Ray kohort</LinkButton>
          <LinkButton href="/" variant="secondary">
            Halaman depan
          </LinkButton>
        </div>
      </div>
    </main>
  );
}
