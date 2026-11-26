import { BellRing, FlaskConical, KeyRound, PhoneCall, type LucideIcon } from "lucide-react";
import { Section } from "@/components/domain/section";
import { fmtInt, fmtModule, fmtPct } from "@/lib/format";
import { landing } from "@/lib/landing";

type Code = (typeof landing.findings.triggers)[number]["code"];

// Interface text per trigger; every number comes from landing.findings (api/scripts/build_landing.py).
const COPY: Record<Code, { icon: LucideIcon; signal: (day: number) => string; rule: string; owner: string }> = {
  no_submission: {
    icon: BellRing,
    signal: () => "Tugas pertama lewat batas tanpa kiriman",
    rule: "Pasang pemicu otomatis di LMS: begitu batas tugas pertama lewat tanpa kiriman, dosen PA langsung mendapat notifikasi dan menelepon minggu itu juga.",
    owner: "Bagian akademik dan tim LMS",
  },
  no_lms: {
    icon: KeyRound,
    signal: () => "Tidak ada catatan LMS yang valid",
    rule: "Cek akses dan status registrasi di minggu pertama. Sebagian besar kasus ini adalah akun yang tidak pernah masuk atau mahasiswa yang sudah mundur diam-diam.",
    owner: "Bagian registrasi dan IT",
  },
  stopped_early: {
    icon: PhoneCall,
    signal: (day) => `Berhenti aktif sebelum hari ke-${day}`,
    rule: "Hubungi sebelum minggu ketiga, lewat telepon, bukan email. Setelah itu jendela untuk menolong makin sempit.",
    owner: "Konselor dan dosen PA",
  },
};

/** Campus-level rules derived from behavioural triggers, plus the controlled pilot that would prove the effect. */
export function CampusActions() {
  const f = landing.findings;
  return (
    <Section
      title="Tiga aturan yang bisa dipasang kampus semester ini"
      description={`Pemicu perilaku dari data latih DSCO (${fmtInt(f.train_n)} mahasiswa berlabel, rata-rata ${fmtPct(f.train_rate)} berisiko). Hanya sinyal yang bisa ditindak, tanpa fitur demografi atau modul.`}
    >
      <ol className="grid gap-3 lg:grid-cols-3">
        {f.triggers.map((t, i) => {
          const c = COPY[t.code];
          const Icon = c.icon;
          return (
            <li key={t.code} className="rise flex flex-col rounded-2xl border border-line bg-surface p-4" style={{ "--i": i } as React.CSSProperties}>
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Icon className="size-4 text-blue" aria-hidden />
                {c.signal(f.early_day)}
              </p>
              <p className="mt-3 flex items-baseline gap-2">
                <span className="numeral text-[2rem] text-tier-critical">{fmtPct(t.rate)}</span>
                <span className="text-[13px] leading-snug text-ink-3">berisiko, dibanding {fmtPct(t.rate_rest)} sisanya</span>
              </p>
              <p className="mt-1 text-xs text-ink-3">
                {fmtInt(t.n_train)} kasus di data latih, {fmtInt(t.n_cohort)} mahasiswa cocok di kohort uji DSCO
              </p>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-ink">{c.rule}</p>
              <p className="mt-3 text-xs font-medium text-ink-2">Penanggung jawab: {c.owner}</p>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 rounded-2xl border border-dashed border-uncertain bg-surface-secondary p-4 text-sm">
        <p className="flex items-center gap-2 text-xs font-semibold text-ink-2">
          <FlaskConical className="size-4" aria-hidden />
          Langkah keempat: buktikan efeknya lewat uji coba terkontrol
        </p>
        <p className="mt-2 leading-relaxed text-ink">
          Model membuktikan siapa yang berisiko, belum membuktikan bahwa kontak konselor mengubah hasilnya. Di modul{" "}
          {f.pilot.modules.map(fmtModule).join(" dan ")}, yang porsi ter-flag-nya tertinggi, bagi {fmtInt(f.pilot.critical)} mahasiswa Kritis secara
          acak menjadi dua kelompok sama besar: satu kelompok dihubungi di minggu ke-4, kelompok lain dihubungi tiga minggu kemudian. Setelah status akhir
          keluar, bandingkan tingkat berisiko kedua kelompok. Karena pembagiannya acak, selisihnya adalah efek kontak yang sebenarnya.
        </p>
      </div>
    </Section>
  );
}
