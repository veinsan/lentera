import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Wordmark } from "@/components/brand/lantern-mark";
import { DemoSignIn } from "@/components/domain/demo-sign-in";
import { fmtInt } from "@/lib/format";
import { landing } from "@/lib/landing";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage() {
  const { cohort, plan } = landing;
  return (
    <main className="night relative isolate grid min-h-[100svh] overflow-hidden bg-night text-night-ink">
      <Image src="/atlas/night-sky.webp" alt="" fill priority sizes="100vw" className="-z-10 object-cover object-bottom" />
      <div className="mx-auto grid w-full max-w-6xl content-between gap-12 px-6 py-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:content-center lg:gap-20 lg:px-10">
        <div className="flex flex-col gap-10 lg:gap-16">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" aria-label="Lentera, ke halaman depan" className="rounded-lg">
              <Wordmark star="var(--starlight)" />
            </Link>
            <Link
              href="/"
              className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm text-night-muted transition-colors hover:bg-white/10 hover:text-night-ink lg:hidden"
            >
              <ArrowLeft className="size-4" aria-hidden /> Halaman depan
            </Link>
          </div>
          <div>
            <h1 className="display rise text-[2.4rem] text-white sm:text-[3.2rem]">Masuk ke Lentera.</h1>
            <p className="rise mt-5 max-w-md text-[17px] leading-relaxed text-night-muted" style={{ "--i": 1 } as React.CSSProperties}>
              Akun demo bersama, tanpa kata sandi. Minggu ini ada <b className="font-semibold text-night-ink">{fmtInt(cohort.flagged)}</b>{" "}
              mahasiswa ter-flag, dan {plan.advisors} konselor menjangkau{" "}
              <b className="font-semibold text-night-ink">{fmtInt(plan.reached)}</b> yang benar-benar berisiko. Pilih peran untuk melihat
              apa yang dilihatnya.
            </p>
            <Link
              href="/"
              className="rise mt-8 hidden h-10 items-center gap-1.5 self-start rounded-full text-sm text-night-muted transition-colors hover:text-night-ink lg:inline-flex"
              style={{ "--i": 2 } as React.CSSProperties}
            >
              <ArrowLeft className="size-4" aria-hidden /> Kembali ke halaman depan
            </Link>
          </div>
        </div>
        <DemoSignIn tone="night" />
      </div>
    </main>
  );
}
