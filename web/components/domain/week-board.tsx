"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Minus, Plus } from "lucide-react";
import { TIER_LABELS, TierPin } from "@/components/domain/tier-badge";
import type { PlanResult, Tier } from "@/lib/api";
import { postJson } from "@/lib/api-browser";
import { fmtInt, fmtModule, fmtNum, fmtProb } from "@/lib/format";
import { ACTION_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

/** Cohort numbers from the database and the model card; nothing here is typed by hand. */
export type CohortFacts = {
  scored: number;
  flagged: number;
  expected: number;
  critical: number;
  uncertain: number;
  ece: number | null;
  context: string;
};

const DEBOUNCE_MS = 250;
const MAX_ADVISORS = 24; // the API's board column limit
const WORDS = ["Nol", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh"];
const TIER_ORDER: Tier[] = ["critical", "high", "watch", "low"];
// Type scale for this screen, four sizes only: 64 (the lever's result), 44 (the finding), 20 (titles and values), 13 (everything else).
const T20 = "text-[20px] leading-tight";
const T13 = "text-[13px] leading-snug";

/** "ter-flag" with a non-breaking hyphen, so the headline never breaks it in two. */
export const TER_FLAG = "ter‑flag";
const BENAR = "benar‑benar";

/** The first viewport: the finding, the capacity control, and the board it fills. One control remaps all three. */
export function WeekBoard({ cohortId, facts }: { cohortId: string; facts: CohortFacts }) {
  const [advisors, setAdvisors] = useState(5);
  const [hours, setHours] = useState(10);
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState(false);
  const request = useRef(0);

  useEffect(() => {
    const id = ++request.current;
    const timer = setTimeout(async () => {
      const res = await postJson<PlanResult>("/plans/preview", { cohort_id: cohortId, advisors, hours_per_advisor: hours, overrides: {} });
      if (id !== request.current) return; // a newer input already asked again
      if (res.status === 200) {
        setPlan(res.body as PlanResult);
        setRevision((r) => r + 1); // re-keys the cards so the refill animates
        setError(false);
      } else setError(true);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [advisors, hours, cohortId]);

  const s = plan?.summary;
  const who = advisors <= 10 ? WORDS[advisors] : fmtInt(advisors);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="sheet relative px-8 pt-8 pb-7">
          <span aria-hidden className="absolute -top-1.5 left-1/2 size-4 -translate-x-1/2 rounded-full bg-foreground shadow-[inset_-3px_-3px_0_rgb(255_255_255/0.18)]" />
          <h1 className="max-w-4xl font-heading text-[2rem] leading-[1.06] font-bold tracking-[-0.025em] text-balance [font-stretch:88%] sm:text-[44px]">
            <span className="marker">{fmtInt(facts.flagged)}</span> dari {fmtInt(facts.scored)} mahasiswa {TER_FLAG}. {who} konselor menjangkau{" "}
            <span className={cn("marker transition-opacity duration-300", !s && "opacity-40")}>{s ? fmtInt(s.expected_at_risk_reached_advisor) : "..."}</span> yang
            {` ${BENAR} `}berisiko minggu ini.
          </h1>
          <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 sm:flex sm:flex-wrap">
            <Fact label={`perkiraan ${BENAR} berisiko`} value={fmtInt(facts.expected)} />
            <Fact label="tier kritis" value={fmtInt(facts.critical)} />
            <Fact label="zona tidak pasti, perlu tinjauan" value={fmtInt(facts.uncertain)} />
            {facts.ece != null && <Fact label="ECE kalibrasi probabilitas" value={fmtNum(facts.ece, 4)} />}
          </dl>
          <p className={cn("mt-5 text-muted-foreground", T13)}>{facts.context}</p>
        </section>

        <section data-slate className="flex flex-col gap-4 rounded-2xl bg-slate p-6 text-slate-foreground">
          <h2 className={cn("font-heading font-bold [font-stretch:92%]", T20)}>Kapasitas konselor</h2>
          <div className="grid grid-cols-2 gap-2.5">
            <Stepper label="Konselor" value={advisors} min={0} max={MAX_ADVISORS} onChange={setAdvisors} />
            <Stepper label="Jam per minggu" value={hours} min={0} max={40} onChange={setHours} />
          </div>
          <p className="text-[64px] text-brand-accent display-numeral">{s ? `+${fmtInt(s.marginal_per_advisor)}` : "..."}</p>
          <p className={cn("-mt-2 text-slate-muted", T13)}>
            mahasiswa berisiko lagi untuk setiap konselor tambahan ({fmtInt(hours)} jam). Perkiraan dari probabilitas terkalibrasi, bukan jumlah yang pasti
            tertolong.
          </p>
          <Link href="/rencana" className={cn("mt-auto inline-flex items-center gap-1.5 self-start font-semibold text-slate-foreground hover:text-brand-accent", T13)}>
            Atur playbook dan simpan rencana <ArrowRight className="size-4" aria-hidden />
          </Link>
        </section>
      </div>

      <section className="rounded-2xl bg-secondary p-5" aria-busy={!plan}>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 className={cn("font-heading font-bold [font-stretch:92%]", T20)}>Papan minggu ini</h2>
          <ul aria-label="Arti warna pin" className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground", T13)}>
            {TIER_ORDER.slice(0, 3).map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <TierPin tier={t} className="ring-0" />
                {TIER_LABELS[t]}
              </li>
            ))}
          </ul>
        </div>
        {error ? (
          <p role="alert" className={cn("text-destructive", T13)}>Papan gagal dihitung. Periksa koneksi ke API model.</p>
        ) : !plan ? (
          <Columns>{Array.from({ length: Math.min(Math.max(advisors, 1), 5) }, (_, i) => <div key={i} className="h-64 animate-pulse rounded-xl bg-accent" />)}</Columns>
        ) : plan.board.columns.length === 0 ? (
          <p className={cn("py-10 text-center text-muted-foreground", T13)}>
            Tanpa jam konselor, hanya {fmtInt(s?.automated_contacts)} pesan otomatis yang terkirim. Tambah konselor untuk mengisi papan.
          </p>
        ) : (
          <Columns>
            {plan.board.columns.map((c) => (
              <AdvisorColumn key={`${revision}-${c.advisor}`} column={c} />
            ))}
          </Columns>
        )}
        {s && (
          <div className={cn("mt-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t-[1.5px] border-dashed border-input pt-4", T13)}>
            <p>
              <b className="font-mono font-semibold">{fmtInt(s.advisor_contacts)}</b> dihubungi konselor ·{" "}
              <b className="font-mono font-semibold">{fmtInt(s.automated_contacts)}</b> dapat pesan otomatis
            </p>
            <p className="text-muted-foreground">
              Di bawah garis: <b className="font-mono font-semibold text-foreground">{fmtInt(s.unassigned)}</b> mahasiswa {TER_FLAG} menunggu kapasitas
              {plan.board.unplaced > 0 && <>, {fmtInt(plan.board.unplaced)} di antaranya muat di total jam tapi tidak utuh di satu konselor</>}.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function Columns({ children }: { children: React.ReactNode }) {
  return <div className="grid auto-cols-[minmax(204px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-1">{children}</div>;
}

function AdvisorColumn({ column: c }: { column: PlanResult["board"]["columns"][number] }) {
  const leftMinutes = c.capacity_minutes - c.minutes_used;
  const more = c.students - c.top.length;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="px-1">
        <h3 className={cn("font-semibold tracking-[0.06em] text-foreground uppercase", T13)}>Konselor {c.advisor}</h3>
        <p className={cn("font-mono whitespace-nowrap text-muted-foreground", T13)}>
          {fmtInt(c.students)} kontak · {fmtNum(c.minutes_used / 60, 1)}/{fmtNum(c.capacity_minutes / 60, 0)} jam
        </p>
        <p className={cn("mt-1 flex flex-wrap gap-x-2.5 text-muted-foreground", T13)} aria-label="Tier di kolom ini">
          {TIER_ORDER.filter((t) => c.tiers[t] > 0).map((t) => (
            <span key={t} className="flex items-center gap-1">
              <TierPin tier={t} className="size-2 ring-0" />
              <span className="sr-only">{TIER_LABELS[t]}</span>
              <span className="font-mono">{fmtInt(c.tiers[t])}</span>
            </span>
          ))}
        </p>
        <ul className={cn("mt-0.5 text-muted-foreground", T13)} aria-label="Tindakan di kolom ini">
          {c.actions.map((a) => (
            <li key={a.action} className="flex justify-between gap-2">
              <span className="truncate">{ACTION_LABELS[a.action] ?? a.action}</span>
              <span className="font-mono">{fmtInt(a.students)}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className={cn("px-1 text-muted-foreground", T13)}>Contoh per tindakan</p>
      <ul className="flex flex-col gap-2">
        {c.top.map((st, i) => (
          <li key={st.id} className="board-in" style={{ "--i": c.advisor * 3 + i } as React.CSSProperties}>
            <Link
              href={`/mahasiswa/${st.id}`}
              className="group relative block rounded-xl bg-card py-2.5 pr-3 pl-8 shadow-[0_1px_0_rgb(22_20_15/0.06)] transition hover:-translate-y-0.5 hover:shadow-overlay"
            >
              <TierPin tier={st.tier} className="absolute top-3.5 left-3 ring-0 group-hover:ring-2 group-hover:ring-brand-accent" />
              <span className="flex items-baseline justify-between gap-2">
                <b className={cn("font-mono font-semibold", T13)}>{st.source_id ?? st.id}</b>
                <span className={cn("font-mono font-semibold", T13)}>
                  <span className="sr-only">{TIER_LABELS[st.tier]}, probabilitas </span>
                  {fmtProb(st.probability)}
                </span>
              </span>
              <span className={cn("block truncate text-muted-foreground", T13)}>
                {st.code_module ? fmtModule(st.code_module) : ""} · {ACTION_LABELS[st.action] ?? st.action}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {more > 0 && <p className={cn("px-1 text-muted-foreground", T13)}>+{fmtInt(more)} mahasiswa lagi di kolom ini</p>}
      {leftMinutes >= 15 && (
        <div className={cn("grid h-11 place-items-center rounded-xl border-[1.5px] border-dashed border-input text-muted-foreground", T13)}>
          Sisa {fmtInt(leftMinutes)} menit
        </div>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dd className={cn("order-1 font-mono font-semibold", T20)}>{value}</dd>
      <dt className={cn("order-2 text-muted-foreground", T13)}>{label}</dt>
    </div>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)));
  const id = `${label.replace(/\s+/g, "-")}-label`;
  return (
    <div className="rounded-xl bg-slate-raised p-3">
      <p className={cn("text-slate-muted", T13)} id={id}>
        {label}
      </p>
      <div className="mt-1 flex items-center justify-between gap-1" role="group" aria-labelledby={id}>
        <button type="button" onClick={() => set(value - 1)} disabled={value <= min} aria-label={`Kurangi ${label.toLowerCase()}`}
          className="grid size-9 place-items-center rounded-full text-slate-foreground hover:bg-slate-line disabled:opacity-30">
          <Minus className="size-4" aria-hidden />
        </button>
        <output aria-live="polite" className={cn("font-mono font-semibold text-white", T20)}>{value}</output>
        <button type="button" onClick={() => set(value + 1)} disabled={value >= max} aria-label={`Tambah ${label.toLowerCase()}`}
          className="grid size-9 place-items-center rounded-full text-slate-foreground hover:bg-slate-line disabled:opacity-30">
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
