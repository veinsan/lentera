import type { Metadata } from "next";
import { DemoSignIn } from "@/components/domain/demo-sign-in";
import { Wordmark } from "@/components/layout/wordmark";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section data-slate className="flex flex-col justify-between gap-12 bg-slate px-10 py-10 text-slate-foreground lg:px-14">
        <Wordmark />
        <div className="max-w-xl">
          <h1 className="font-heading text-4xl leading-[1.05] font-bold tracking-[-0.025em] [font-stretch:88%] lg:text-[44px]">
            Prediksi minggu ke-4 menjadi <span className="marker-solid">daftar kontak</span> untuk setiap konselor.
          </h1>
          <p className="mt-5 max-w-md text-base text-slate-muted">
            Lentera memakai model DSCO 2026 untuk menentukan siapa yang dihubungi lebih dulu, tindakan apa untuk tiap mahasiswa, dan berapa
            mahasiswa berisiko yang terjangkau dengan jam konselor yang ada.
          </p>
        </div>
        <p className="text-sm text-slate-muted">Kompetisi DSCO 2026 · babak final</p>
      </section>
      <section className="flex flex-col justify-center gap-6 px-6 py-10 sm:px-10 lg:px-16">
        <div>
          <h2 className="font-heading text-2xl font-bold [font-stretch:92%]">Masuk sebagai</h2>
          <p className="mt-1 text-sm text-muted-foreground">Akun demo bersama, tanpa kata sandi. Pilih peran untuk melihat apa yang dilihatnya.</p>
        </div>
        <DemoSignIn />
      </section>
    </main>
  );
}
