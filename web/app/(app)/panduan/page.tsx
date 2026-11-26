import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, HandHeart, ShieldCheck } from "lucide-react";
import { Section } from "@/components/domain/section";
import { PageHeader } from "@/components/layout/page-header";
import { NAV_ITEMS } from "@/lib/nav";

export const metadata: Metadata = {
  title: "Panduan pemakaian",
  description: "Jalur demo satu menit, alur kerja mingguan, dan prinsip memakai skor risiko Lentera.",
};

// The demo path follows the presenter shortcuts in lib/nav.ts, so the key shown here is the one that works.
const DEMO: { href: string; what: string }[] = [
  { href: "/dashboard", what: "Baca judulnya: berapa mahasiswa yang perlu perhatian minggu ini. Lalu lihat bukti rencana kontak dan empat tier risiko." },
  { href: "/prioritas", what: "Buka mahasiswa Kritis teratas. Tunjukkan alasan risikonya, skenario what-if, draf pesan, lalu catat kontaknya." },
  { href: "/rencana", what: "Ubah jumlah konselor. Lihat berapa yang terjangkau, berapa konselor tambahan yang dibutuhkan, dan skenario biayanya." },
  { href: "/insight", what: "Tunjukkan tiga aturan yang bisa dipasang kampus dan desain uji coba untuk membuktikan efek kontak." },
  { href: "/model", what: "Tutup dengan bukti: F1 pada hasil akhir asli, ambang yang ditetapkan sebelumnya, dan batas bukti." },
];

const WEEK = [
  { when: "Minggu ke-4, hari pertama", who: "Koordinator", what: "Unggah ekspor LMS minggu 1 sampai 4. Lentera mengecek kualitas data lalu menilai setiap mahasiswa." },
  { when: "Hari yang sama", who: "Koordinator", what: "Atur jumlah konselor dan jam di Rencana intervensi, lalu simpan rencananya." },
  { when: "Minggu ke-4 sampai ke-5", who: "Konselor", what: "Kerjakan Daftar prioritas dari atas. Pakai draf pesan, lalu catat hasil setiap kontak di profil mahasiswa." },
  { when: "Setiap minggu", who: "Koordinator", what: "Pantau corong tindak lanjut di X-Ray kohort. Mahasiswa yang tidak terjangkau dicoba lewat kanal lain." },
  { when: "Akhir semester", who: "Koordinator", what: "Unggah status akhir. Tab Hasil akhir menunjukkan dampak kontak dan akurasi model pada kohort itu." },
];

const PRINCIPLES = [
  "Skor dipakai untuk menawarkan bantuan, bukan memberi label. Jangan sebut skor atau kata berisiko kepada mahasiswa.",
  "Konselor tetap pengambil keputusan. Lentera hanya mengurutkan siapa yang dilihat lebih dulu dan menyarankan tindakan.",
  "Skor tidak pernah menjadi dasar sanksi, nilai, atau keputusan administratif.",
  "Tier Rendah bukan berarti aman. Mahasiswa yang datang sendiri tetap dilayani seperti biasa.",
  "Mahasiswa di zona tidak pasti perlu ditinjau manusia sebelum ada tindakan.",
  "Demografi, modul, dan beban SKS tidak pernah menjadi alasan intervensi. Alasan selalu berasal dari perilaku belajar yang bisa diubah.",
];

const TERMS = [
  { term: "Peluang berisiko", meaning: "Perkiraan peluang mahasiswa gagal atau mundur. Terkalibrasi: dari 100 mahasiswa dengan peluang 0,70, sekitar 70 memang berisiko." },
  { term: "Tier", meaning: "Seberapa mendesak: Kritis, Tinggi, Pantau, Rendah. Ambangnya ditetapkan di API, bukan di tampilan." },
  { term: "Archetype", meaning: "Pola perilaku yang menjelaskan kenapa mahasiswa berisiko, misalnya Senyap atau Melewatkan tugas. Archetype menentukan tindakan dari playbook." },
  { term: "Skenario", meaning: "Angka yang bergantung pada asumsi, seperti efektivitas atau biaya. Selalu diberi label garis putus-putus dan bukan efek kausal." },
];

export default function Page() {
  const byHref = new Map(NAV_ITEMS.map((n) => [n.href, n]));
  return (
    <>
      <PageHeader
        title="Lentera dipakai dalam lima langkah, dari unggah data sampai bukti di akhir semester."
        description="Jalur demo satu menit, alur kerja mingguan, dan prinsip memakai skor risiko dengan aman."
      />
      <div className="flex flex-col gap-5">
        <Section title="Demo dalam satu menit" description="Tekan angka di keyboard untuk pindah halaman, atau Ctrl+K untuk mencari mahasiswa.">
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
            {DEMO.map((d, i) => {
              const nav = byHref.get(d.href);
              if (!nav) return null;
              const Icon = nav.icon;
              return (
                <li key={d.href} className="rise flex flex-col rounded-2xl border border-line bg-surface p-4" style={{ "--i": i } as React.CSSProperties}>
                  <p className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                      <Icon className="size-4 text-blue" aria-hidden />
                      {nav.label}
                    </span>
                    <kbd className="rounded-md border border-line px-1.5 font-mono text-xs text-ink-3">{nav.key}</kbd>
                  </p>
                  {!nav.roles.includes("advisor") && <p className="mt-2 text-xs font-medium text-ink-3">Khusus Koordinator dan Admin</p>}
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-2">{d.what}</p>
                  <Link href={d.href} className="mt-3 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-blue-ink hover:underline">
                    Buka <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ol>
        </Section>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Section title="Alur kerja satu semester" description="Siapa melakukan apa, dari minggu ke-4 sampai status akhir keluar.">
            <ol className="flex flex-col gap-4">
              {WEEK.map((w, i) => (
                <li key={w.what} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3">
                  <span className="grid size-7 place-items-center rounded-full bg-blue text-xs font-semibold text-white tabular-nums">{i + 1}</span>
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {w.when} <span className="font-normal text-ink-3">oleh {w.who}</span>
                    </p>
                    <p className="mt-0.5 text-sm leading-relaxed text-ink-2">{w.what}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          <Section
            title="Prinsip pemakaian"
            description="Aturan ini berlaku untuk semua peran."
            actions={<ShieldCheck className="size-5 text-blue" aria-hidden />}
          >
            <ul className="flex flex-col gap-3">
              {PRINCIPLES.map((p) => (
                <li key={p} className="flex gap-3 text-sm leading-relaxed text-ink">
                  <HandHeart className="mt-0.5 size-4 shrink-0 text-blue" aria-hidden />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <Section title="Istilah yang muncul di aplikasi">
          <dl className="grid gap-x-6 gap-y-4 md:grid-cols-2">
            {TERMS.map((t) => (
              <div key={t.term}>
                <dt className="text-sm font-semibold text-ink">{t.term}</dt>
                <dd className="mt-0.5 text-sm leading-relaxed text-ink-2">{t.meaning}</dd>
              </div>
            ))}
          </dl>
        </Section>
      </div>
    </>
  );
}
