import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, KeyRound, Lock, ScanEye, UserRoundCheck } from "lucide-react";
import { LanternMark, Wordmark } from "@/components/brand/lantern-mark";
import { DemoSignIn } from "@/components/domain/demo-sign-in";
import { KaggleScores } from "@/components/domain/kaggle-scores";
import { HeroSky } from "@/components/sky/sky-stage";
import { LinkButton } from "@/components/ui/link-button";
import { fmtInt, fmtModule, fmtNum, fmtPct } from "@/lib/format";
import { ARCHETYPE_LABELS } from "@/lib/labels";
import { landing } from "@/lib/landing";
import { NIGHT_TIER_COLORS } from "@/lib/sky";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: { absolute: "Lentera: dari prediksi minggu ke-4 ke rencana kontak konselor" },
  alternates: { canonical: "/" },
};

const { model, cohort, quality, plan, sky } = landing;
const TIERS = [
  ["critical", "Kritis", "bg-tier-critical"],
  ["high", "Tinggi", "bg-tier-high"],
  ["watch", "Pantau", "bg-tier-watch"],
  ["low", "Rendah", "bg-tier-low"],
] as const;
const NIGHT_DOT = { low: NIGHT_TIER_COLORS[0], watch: NIGHT_TIER_COLORS[1], high: NIGHT_TIER_COLORS[2], critical: NIGHT_TIER_COLORS[3] } as const;
// Legend dots grow with risk, as the stars do (magnitude key).
const MAG = { low: 5, watch: 8, high: 10, critical: 13 } as const;
const REPAIR_TEXT: Record<string, string> = {
  ggg_to_m07: "label modul GGG dipulihkan menjadi M07",
  normalize_highest_education: "nilai pendidikan terakhir dinormalkan",
};

export default function Landing() {
  return (
    <div className="text-ink">
      <LandingNav />
      <Hero />
      <main id="konten" className="relative z-10 -mt-10 overflow-clip rounded-t-[36px] bg-paper">
        {/* The generated atlas plate under the day sections; content plates stay solid white above it. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[url(/atlas/day-atlas.webp)] bg-[length:100%_auto] bg-repeat-y opacity-75" />
        <div className="relative">
          <Stages />
          <Safety />
          <Proof />
        </div>
      </main>
      <Close />
      <footer className="bg-night px-6 pb-10 text-sm text-night-muted">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-night-line pt-6">
          <span className="inline-flex items-center gap-2 text-night-ink">
            <LanternMark className="h-5" star="var(--starlight)" /> Lentera, untuk babak final DSCO 2026
          </span>
          <span>Data: {cohort.name}, ID mahasiswa anonim dari data kompetisi.</span>
        </div>
      </footer>
    </div>
  );
}

function LandingNav() {
  return (
    <header className="fixed inset-x-0 top-3 z-40 px-3">
      <nav
        aria-label="Navigasi halaman"
        className="glass-night mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 rounded-full !bg-[rgb(8_22_52/0.92)] pr-2 pl-5 text-night-ink"
      >
        <Link href="/" aria-label="Lentera" className="rounded-lg">
          <Wordmark star="var(--starlight)" />
        </Link>
        <div className="hidden items-center gap-1 text-sm text-night-ink md:flex">
          {[
            ["#cara-kerja", "Cara kerja"],
            ["#keamanan", "Keamanan"],
            ["#bukti", "Bukti model"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="rounded-full px-3.5 py-2 transition-colors hover:bg-white/10 hover:text-night-ink">
              {label}
            </a>
          ))}
        </div>
        <LinkButton href="/login" className="glass-lens bg-white font-semibold text-night hover:bg-white/90">
          Masuk ke demo
        </LinkButton>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="night relative isolate min-h-[calc(100svh-10rem)] overflow-hidden bg-night pb-16 text-night-ink">
      <Image
        src="/atlas/night-sky.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="hero-depth-far -z-20 object-cover object-bottom"
      />
      <div className="mx-auto grid min-h-[calc(100svh-10rem)] max-w-7xl items-center gap-6 px-6 pt-24 lg:grid-cols-[minmax(0,6fr)_minmax(0,7fr)] lg:px-10">
        <div className="relative z-10 max-w-2xl">
          <h1 id="hero-title" className="display rise text-[2.5rem] text-white sm:text-[3.2rem] xl:text-[3.9rem]">
            Dari prediksi minggu ke‑4 ke rencana kontak setiap konselor.
          </h1>
          <p className="rise mt-6 max-w-lg text-[17px] leading-relaxed text-night-muted" style={{ "--i": 1 } as React.CSSProperties}>
            Lentera menilai risiko setiap mahasiswa dari empat minggu pertama perkuliahan, menunjukkan alasannya, lalu membagi jam
            konselor ke mahasiswa yang paling mungkin terbantu.
          </p>
          <div className="rise mt-9 flex flex-wrap items-center gap-3" style={{ "--i": 2 } as React.CSSProperties}>
            <LinkButton href="/login" size="lg" className="glass-lens h-12 bg-white px-6 text-[15px] font-semibold text-night hover:bg-white/90">
              Masuk ke demo <ArrowRight aria-hidden />
            </LinkButton>
            <a
              href="#cara-kerja"
              className="inline-flex h-12 items-center gap-2 rounded-full px-5 text-[15px] font-medium text-night-ink transition-colors hover:bg-white/10"
            >
              Lihat cara kerja <ArrowDown className="size-4" aria-hidden />
            </a>
          </div>
          <div className="rise mt-12 max-w-md" style={{ "--i": 3 } as React.CSSProperties}>
            <p className="text-sm leading-relaxed text-night-muted">
              Setiap titik di langit ini adalah satu dari <b className="font-semibold text-night-ink">{fmtInt(cohort.scored)}</b> mahasiswa
              kohort uji DSCO. Titik hangat adalah <b className="font-semibold text-night-ink">{fmtInt(cohort.flagged)}</b> yang ter-flag;
              makin besar dan hangat, makin tinggi risikonya. Garis kuning menghubungkan bintang paling berisiko di setiap gugus.
            </p>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-night-muted">
              {TIERS.map(([t, label]) => (
                <li key={t} className="inline-flex items-center gap-2">
                  <span className="rounded-full" style={{ width: MAG[t], height: MAG[t], background: NIGHT_DOT[t], boxShadow: `0 0 10px ${NIGHT_DOT[t]}` }} />
                  {label} <span className="tabular-nums text-night-ink">{fmtInt(cohort.tiers[t])}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="hero-depth-mid relative h-[420px] sm:h-[520px] lg:h-[min(76vh,720px)]">
          <div className="sky-in absolute inset-0">
            <HeroSky sky={sky} wide={false} />
          </div>
        </div>
      </div>
    </section>
  );
}

function StageRow({ n, title, children, record }: { n: number; title: string; children: React.ReactNode; record: React.ReactNode }) {
  return (
    <li className="reveal grid items-center gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
      <div className="flex gap-5">
        <span className="numeral grid size-11 shrink-0 place-items-center rounded-full bg-blue text-lg text-white">{n}</span>
        <div>
          <h3 className="text-[1.45rem] font-semibold tracking-[-0.02em] text-ink">{title}</h3>
          <p className="mt-2 max-w-[52ch] text-[15px] leading-relaxed text-ink-2">{children}</p>
        </div>
      </div>
      <div className="drift">{record}</div>
    </li>
  );
}

function Stages() {
  const lit = plan.contacts + plan.automated;
  return (
    <section id="cara-kerja" aria-labelledby="cara-kerja-title" className="mx-auto max-w-6xl scroll-mt-24 px-6 pt-12 pb-10 lg:px-10">
      <div className="reveal max-w-3xl">
        <h2 id="cara-kerja-title" className="display text-[2.2rem] sm:text-[3rem]">
          Empat langkah dari file CSV ke daftar telepon.
        </h2>
        <p className="mt-4 text-[17px] leading-relaxed text-ink-2">
          Semua angka di bawah dihitung dari kohort yang sama dengan langit di atas, oleh model dan aturan yang berjalan di Lentera.
        </p>
      </div>
      <ol className="mt-16 flex flex-col gap-20">
        <StageRow
          n={1}
          title="Periksa data minggu ke-4"
          record={
            <Record caption="Laporan kualitas data">
              <p className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-ink-3">Baris diperiksa</span>
                <span className="numeral text-3xl">{fmtInt(quality.rows)}</span>
              </p>
              <ul className="mt-4 flex flex-col divide-y divide-separator text-sm">
                {quality.repairs.map((r) => (
                  <li key={r.code} className="flex items-baseline justify-between gap-4 py-2.5">
                    <span className="text-ink-2">{REPAIR_TEXT[r.code] ?? r.code}</span>
                    <span className="font-mono font-semibold text-ink tabular-nums">{fmtInt(r.count)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 inline-flex h-7 items-center rounded-full bg-[#e3f4ec] px-3 text-xs font-semibold text-success">
                Lolos pemeriksaan, siap dinilai
              </p>
            </Record>
          }
        >
          Lentera membaca ekspor LMS, memeriksa kolom, tipe, dan batas nilai, lalu memulihkan label yang rusak sebelum satu pun skor
          dihitung. File yang tidak lolos ditolak dengan alasan per kolom.
        </StageRow>

        <StageRow
          n={2}
          title="Hitung peluang yang bisa dijumlah"
          record={
            <Record caption="Skor kohort">
              <div className="grid grid-cols-2 gap-4">
                <Figure label="Perkiraan benar-benar berisiko" value={fmtInt(cohort.expected_at_risk)} />
                <Figure label="Kalibrasi (ECE)" value={fmtNum(model.ece, 4)} />
              </div>
              <div className="mt-5 flex h-3 overflow-hidden rounded-full" role="img" aria-label="Sebaran tier risiko">
                {TIERS.map(([t, , bg]) => (
                  <span key={t} className={bg} style={{ flexGrow: cohort.tiers[t] }} />
                ))}
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-ink-3 sm:grid-cols-4">
                {TIERS.map(([t, label, bg]) => (
                  <li key={t} className="inline-flex items-center gap-1.5">
                    <span className={cn("size-2 rounded-full", bg)} />
                    {label} <b className="font-semibold text-ink tabular-nums">{fmtInt(cohort.tiers[t])}</b>
                  </li>
                ))}
              </ul>
            </Record>
          }
        >
          Gabungan LightGBM dan DAE-MLP memberi setiap mahasiswa probabilitas yang terkalibrasi. Karena peluangnya jujur, jumlahnya menjadi perkiraan
          berapa mahasiswa yang benar-benar berisiko, dan perkiraan itu yang dipakai untuk merencanakan kapasitas.
        </StageRow>

        <StageRow
          n={3}
          title="Jelaskan alasan, pilih tindakan"
          record={
            <Record caption="Archetype dan tindakan playbook">
              <ul className="flex flex-col divide-y divide-separator text-sm">
                {Object.entries(cohort.archetypes).map(([a, v]) => (
                  <li key={a} className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 py-2.5 sm:grid-cols-[minmax(0,9rem)_1fr_auto]">
                    <span className="font-medium text-ink">{ARCHETYPE_LABELS[a]}</span>
                    <span className="hidden text-ink-3 sm:block">{v.action}</span>
                    <span className="font-mono text-ink tabular-nums">{fmtInt(v.flagged)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-ink-3">Angka kanan: mahasiswa ter-flag per archetype.</p>
            </Record>
          }
        >
          Setiap skor punya alasan dari {model.signals} sinyal; {model.actionable_signals} di antaranya bisa ditindaklanjuti, sisanya
          konteks yang tidak pernah dijadikan alasan intervensi. Pola perilaku menentukan satu dari {model.archetypes} archetype, dan
          archetype menentukan tindakannya.
        </StageRow>

        <StageRow
          n={4}
          title="Bagi jam konselor"
          record={
            <Record caption={`${plan.advisors} konselor, ${plan.hours} jam per minggu`}>
              <div className="grid grid-cols-2 gap-4">
                <Figure label="Berisiko terjangkau konselor" value={fmtInt(plan.reached)} tone="blue" />
                <Figure label="Per konselor tambahan" value={`+${fmtInt(plan.marginal)}`} />
              </div>
              <div className="mt-5" role="img" aria-label={`${fmtInt(lit)} dari ${fmtInt(cohort.flagged)} mahasiswa ter-flag tertangani minggu ini`}>
                <div className="flex h-3 overflow-hidden rounded-full bg-queue-track">
                  <span className="bg-blue" style={{ flexGrow: plan.contacts }} />
                  <span className="bg-starlight" style={{ flexGrow: plan.automated }} />
                  <span style={{ flexGrow: plan.waiting }} />
                </div>
                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-ink-3">
                  <li className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-blue" /> Ditelepon konselor <b className="text-ink tabular-nums">{fmtInt(plan.contacts)}</b>
                  </li>
                  <li className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-starlight" /> Pesan otomatis <b className="text-ink tabular-nums">{fmtInt(plan.automated)}</b>
                  </li>
                  <li className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-queue-track ring-1 ring-line-strong" /> Menunggu kapasitas{" "}
                    <b className="text-ink tabular-nums">{fmtInt(plan.waiting)}</b>
                  </li>
                </ul>
              </div>
            </Record>
          }
        >
          Jam konselor diberikan ke mahasiswa dengan nilai harapan tertinggi per menit. Yang cukup dengan pesan otomatis tidak memakai
          jam konselor, dan yang belum muat menunggu di antrean, bukan dijejalkan.
        </StageRow>
      </ol>
    </section>
  );
}

function Record({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <figure className="plate p-5 sm:p-6">
      <figcaption className="mb-4 text-[13px] font-semibold text-ink-3">{caption}</figcaption>
      {children}
    </figure>
  );
}

function Figure({ label, value, tone = "ink" }: { label: string; value: string; tone?: "ink" | "blue" }) {
  return (
    <div>
      <p className="text-xs leading-snug text-ink-3">{label}</p>
      <p className={cn("numeral settle mt-1 text-[2.1rem]", tone === "blue" && "text-blue")}>{value}</p>
    </div>
  );
}

function Safety() {
  const visible = new Set(cohort.advisor_modules);
  const points = [
    {
      icon: Lock,
      title: "Akses per modul ditegakkan di database",
      text: `Konselor demo hanya bisa membaca ${fmtInt(cohort.advisor_visible)} dari ${fmtInt(cohort.scored)} mahasiswa. Row Level Security di Postgres yang menolak sisanya, bukan tampilan yang menyembunyikannya.`,
    },
    {
      icon: KeyRound,
      title: "Kredensial tetap di server",
      text: "Browser hanya mengirim nama peran. Kata sandi akun demo dan kunci layanan basis data tidak pernah dikirim ke perangkat Anda.",
    },
    {
      icon: ScanEye,
      title: "Ketidakpastian ditampilkan, bukan disembunyikan",
      text: `${fmtInt(cohort.uncertain)} mahasiswa berada di zona tidak pasti dan ditandai untuk ditinjau manusia. Hasil skenario selalu berlabel skenario model, bukan efek kausal.`,
    },
    {
      icon: UserRoundCheck,
      title: "Keputusan tetap di tangan konselor",
      text: "Lentera tidak mengirim pesan dan tidak menulis teks dengan AI. Template disusun dari playbook; konselor yang memutuskan dan mencatat hasil kontak.",
    },
  ];
  return (
    <section id="keamanan" aria-labelledby="keamanan-title" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24 lg:px-10">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
        <div className="reveal">
          <h2 id="keamanan-title" className="display text-[2.2rem] sm:text-[3rem]">
            Hati-hati dengan data, jujur soal ketidakpastian.
          </h2>
          <figure className="plate mt-10 p-5 sm:p-6">
            <figcaption className="mb-4 text-[13px] font-semibold text-ink-3">Yang terlihat oleh akun Konselor demo</figcaption>
            <ul className="flex flex-col gap-1.5">
              {Object.entries(cohort.modules).map(([m, n]) => {
                const on = visible.has(m);
                return (
                  <li
                    key={m}
                    className={cn(
                      "flex h-10 items-center justify-between rounded-xl px-3.5 text-sm",
                      on ? "bg-blue-soft font-semibold text-blue-ink" : "bg-surface-secondary text-ink-3",
                    )}
                  >
                    <span className="inline-flex items-center gap-2">
                      {on ? <span className="size-2 rounded-full bg-blue" /> : <Lock className="size-3.5" aria-hidden />}
                      {fmtModule(m)}
                    </span>
                    <span className="tabular-nums">{on ? `${fmtInt(n)} mahasiswa` : "ditolak RLS"}</span>
                  </li>
                );
              })}
            </ul>
          </figure>
        </div>
        <ul className="flex flex-col divide-y divide-line self-end">
          {points.map(({ icon: Icon, title, text }) => (
            <li key={title} className="reveal flex gap-5 py-7 first:pt-0">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blue-soft text-blue">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <h3 className="text-lg font-semibold tracking-[-0.01em] text-ink">{title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Proof() {
  const rows: [string, React.ReactNode, string][] = [
    [
      `F1 validasi silang ${model.folds}-fold`,
      `${fmtNum(model.cv_f1, 4)} ± ${fmtNum(model.cv_f1_sd, 4)}`,
      "prediksi out-of-fold; ambang plug-in dari probabilitas, tanpa melihat label",
    ],
    ["Kalibrasi (ECE)", fmtNum(model.ece, 4), "selisih rata-rata antara peluang yang diberikan dan kejadian sebenarnya"],
    [
      "Skor Kaggle",
      <KaggleScores key="kaggle" pub={model.kaggle_public} priv={model.kaggle_private} />,
      "F1 model final tim di leaderboard DSCO 2026",
    ],
  ];
  return (
    <section id="bukti" aria-labelledby="bukti-title" className="mx-auto max-w-6xl scroll-mt-24 px-6 pt-8 pb-28 lg:px-10">
      <div className="reveal max-w-3xl">
        <h2 id="bukti-title" className="display text-[2.2rem] sm:text-[3rem]">
          Angka yang bisa dicek ulang.
        </h2>
        <p className="mt-4 text-[17px] leading-relaxed text-ink-2">
          Validasi dan kalibrasi dihitung ulang dari pipeline DSCO, skor Kaggle diambil dari leaderboard kompetisi. Model card lengkap,
          fairness per kelompok, dan drift ada di halaman Model setelah masuk.
        </p>
      </div>
      <dl className="reveal plate mt-12 divide-y divide-separator px-5 sm:px-8">
        {rows.map(([label, value, note]) => (
          <div key={label} className="grid gap-1 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline sm:gap-8">
            <dt>
              <span className="block text-[15px] font-semibold text-ink">{label}</span>
              <span className="mt-0.5 block text-sm text-ink-3">{note}</span>
            </dt>
            <dd className="numeral text-[1.6rem] whitespace-nowrap text-ink sm:text-right">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-ink-3">
        Ambang ter-flag: {fmtPct(model.threshold, 1)} probabilitas, dari aturan plug-in expected F1 pada kohort uji, tanpa label.
      </p>
    </section>
  );
}

function Close() {
  return (
    <section aria-labelledby="masuk-title" className="night relative isolate overflow-clip bg-night px-6 pt-24 pb-20 text-night-ink">
      <Image src="/atlas/night-sky.webp" alt="" fill sizes="100vw" className="-z-10 object-cover object-top opacity-60" />
      <div className="mx-auto max-w-6xl">
        <h2 id="masuk-title" className="display reveal max-w-2xl text-[2.2rem] text-white sm:text-[3rem]">
          Masuk sebagai salah satu peran demo.
        </h2>
        <p className="reveal mt-4 max-w-xl text-[17px] leading-relaxed text-night-muted">
          Satu klik, tanpa kata sandi. Peran menentukan modul dan halaman yang terlihat, persis seperti di institusi.
        </p>
        <div className="mt-10">
          <DemoSignIn tone="night" layout="row" />
        </div>
      </div>
    </section>
  );
}
