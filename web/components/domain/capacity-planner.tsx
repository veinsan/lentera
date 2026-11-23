"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, Label, NumberField, toast } from "@heroui/react";
import { FlaskConical, RotateCcw } from "lucide-react";
import { ReachCurveChart } from "@/components/charts/reach-curve-chart";
import { Section } from "@/components/domain/section";
import { Num, Stat } from "@/components/domain/stat";
import { TIER_LABELS, TierDot } from "@/components/domain/tier-badge";
import type { PlanResult, PlaybookRow, Tier } from "@/lib/api";
import { postJson } from "@/lib/api-browser";
import { fmtInt, fmtModule, fmtNum, fmtProb } from "@/lib/format";
import { ACTION_LABELS, ARCHETYPE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

type Overrides = Record<string, { minutes: number; effectiveness: number }>;
const CHANNEL_LABELS = { advisor: "Konselor", automated: "Otomatis", unassigned: "Belum terjangkau" } as const;
const TIER_ORDER: Tier[] = ["critical", "high", "watch", "low"];
const DEBOUNCE_MS = 300;

export function CapacityPlanner({ cohortId, ece }: { cohortId: string; ece: number | null }) {
  const router = useRouter();
  const [advisors, setAdvisors] = useState(5);
  const [hours, setHours] = useState(10);
  const [defaults, setDefaults] = useState<PlaybookRow[] | null>(null);
  const [overrides, setOverrides] = useState<Overrides>({});
  const [result, setResult] = useState<PlanResult | null>(null);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const request = useRef(0);

  const body = { cohort_id: cohortId, advisors, hours_per_advisor: hours, overrides };

  useEffect(() => {
    const id = ++request.current;
    const timer = setTimeout(async () => {
      const res = await postJson<PlanResult>("/plans/preview", body);
      if (id !== request.current) return; // a newer input already started another preview
      if (res.status === 200) {
        const plan = res.body as PlanResult;
        setResult(plan);
        setRevision((r) => r + 1); // re-keys the board cards so the refill animates
        setError(null);
        setDefaults((d) => d ?? plan.playbook);
      } else setError("Rencana gagal dihitung. Periksa angka yang dimasukkan, atau tunggu API model bangun.");
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // body is rebuilt from these values on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advisors, hours, overrides, cohortId]);

  function setOverride(row: PlaybookRow, key: "minutes" | "effectiveness", value: number) {
    const current = overrides[row.archetype] ?? { minutes: row.minutes, effectiveness: row.effectiveness };
    setOverrides({ ...overrides, [row.archetype]: { ...current, [key]: value } });
  }

  function save() {
    startSave(async () => {
      const res = await postJson<{ id: number }>("/plans", body);
      if (res.status === 200) {
        toast.success(`Rencana #${(res.body as { id: number }).id} tersimpan`);
        router.refresh();
      } else setError("Rencana gagal disimpan. Coba lagi sebentar lagi.");
    });
  }

  const s = result?.summary;
  const capacityHours = advisors * hours;

  return (
    <div className="flex flex-col gap-5">
      <section className="plate rise flex flex-wrap items-end gap-x-6 gap-y-4 p-5 sm:p-6" style={{ "--i": 1 } as React.CSSProperties}>
        <Stepper label="Jumlah konselor" value={advisors} max={200} onChange={setAdvisors} />
        <Stepper label="Jam per konselor per minggu" value={hours} max={80} onChange={setHours} />
        <p className="pb-3 text-sm text-ink-3">
          = <b className="font-semibold text-ink tabular-nums">{fmtInt(capacityHours)}</b> jam konselor per minggu
        </p>
        <Button onPress={save} isDisabled={!result} isPending={saving} className="ml-auto">
          {saving ? "Menyimpan..." : "Simpan rencana"}
        </Button>
        {error && (
          <p role="alert" className="w-full text-sm text-danger">
            {error}
          </p>
        )}
      </section>

      {!s ? (
        <div className="plate grid h-40 place-items-center text-sm text-ink-3" aria-busy>
          Menghitung rencana...
        </div>
      ) : (
        <>
          <section className="plate grid grid-cols-2 gap-x-6 gap-y-6 p-5 sm:p-6 lg:grid-cols-5" aria-label="Hasil rencana">
            <Stat label="Dihubungi konselor" value={s.advisor_contacts} note={`${fmtInt(s.minutes_used / 60)} dari ${fmtInt(capacityHours)} jam terpakai`} />
            <Stat
              label="Berisiko terjangkau konselor"
              value={s.expected_at_risk_reached_advisor}
              tone="blue"
              note={s.advisor_mean_probability != null ? `rata-rata probabilitas ${fmtProb(s.advisor_mean_probability)}` : undefined}
            />
            <Stat label="Cakupan" value={s.advisor_coverage} format="pct1" note={`dari ${fmtInt(s.expected_at_risk_cohort)} perkiraan berisiko`} />
            <Stat label="Pesan otomatis" value={s.automated_contacts} note={`${fmtInt(s.expected_at_risk_reached_automated)} perkiraan berisiko`} />
            <Stat label="Menunggu kapasitas" value={s.unassigned} note="ter-flag, butuh konselor, belum muat" />
          </section>

          <p className="px-1 text-sm leading-relaxed text-ink-2">
            Menambah satu konselor ({fmtInt(hours)} jam) menjangkau sekitar{" "}
            <b className="font-semibold text-blue">
              <Num value={s.marginal_per_advisor} prefix="+" />
            </b>{" "}
            mahasiswa berisiko lagi. Perkiraan memakai probabilitas terkalibrasi{ece != null && ` (ECE ${fmtNum(ece, 4)})`}, bukan jumlah
            mahasiswa yang pasti tertolong.
          </p>

          {s.is_scenario && (
            <div className="rounded-2xl border border-dashed border-uncertain bg-surface-secondary p-5 text-sm">
              <p className="flex items-center gap-2 text-xs font-semibold text-ink-2">
                <FlaskConical className="size-4" aria-hidden />
                Skenario model, bukan efek kausal
              </p>
              <p className="mt-2 leading-relaxed text-ink">
                Dengan asumsi efektivitas di bawah, perkiraan mahasiswa berisiko yang tertolong:{" "}
                <b className="numeral text-xl">{fmtInt(s.estimated_retained_scenario)}</b>. Angka ini bergantung sepenuhnya pada asumsi
                efektivitas.
              </p>
            </div>
          )}

          <AdvisorBoard plan={result} revision={revision} />

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[3fr_2fr]">
            <Section title="Kurva jangkauan" description="Perkiraan mahasiswa berisiko yang terjangkau konselor untuk setiap tambahan jam.">
              <ReachCurveChart curve={result.curve} currentHours={capacityHours} />
            </Section>
            <Section title="Alokasi intervensi" description="Satu intervensi playbook per mahasiswa ter-flag.">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-separator text-left text-xs text-ink-3">
                    <th className="py-2 pr-3 font-medium">Intervensi</th>
                    <th className="py-2 pr-3 font-medium">Kanal</th>
                    <th className="py-2 pr-3 text-right font-medium">Mhs</th>
                    <th className="py-2 pr-3 text-right font-medium">Berisiko</th>
                    <th className="py-2 text-right font-medium">Jam</th>
                  </tr>
                </thead>
                <tbody>
                  {s.per_action.map((a) => (
                    <tr key={`${a.action}-${a.channel}`} className={cn("border-b border-separator/70", a.channel === "unassigned" && "text-ink-3")}>
                      <td className="py-2.5 pr-3">{ACTION_LABELS[a.action] ?? a.action}</td>
                      <td className="py-2.5 pr-3 text-xs">{CHANNEL_LABELS[a.channel]}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{fmtInt(a.students)}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{fmtInt(a.expected_at_risk)}</td>
                      <td className="py-2.5 text-right tabular-nums">{a.channel === "advisor" ? fmtNum(a.minutes / 60, 1) : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          </div>

          {defaults && (
            <Section
              title="Asumsi playbook"
              description="Menit konselor dan efektivitas per archetype. Efektivitas 1,0 berarti semua intervensi dianggap sama efektif, sehingga planner memprioritaskan cek singkat untuk mahasiswa Senyap. Turunkan efektivitas bila mahasiswa Senyap kemungkinan sudah mundur."
              actions={
                Object.keys(overrides).length > 0 && (
                  <Button variant="ghost" size="sm" onPress={() => setOverrides({})}>
                    <RotateCcw aria-hidden /> Kembalikan ke default
                  </Button>
                )
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-separator text-left text-xs text-ink-3">
                      <th className="py-2 pr-3 font-medium">Archetype</th>
                      <th className="py-2 pr-3 font-medium">Intervensi</th>
                      <th className="w-36 py-2 pr-3 font-medium">Menit konselor</th>
                      <th className="w-36 py-2 font-medium">Efektivitas (0 sampai 1)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {defaults.map((row) => {
                      const o = overrides[row.archetype] ?? row;
                      return (
                        <tr key={row.archetype} className="border-b border-separator/70">
                          <td className="py-2 pr-3 font-medium text-ink">{ARCHETYPE_LABELS[row.archetype]}</td>
                          <td className="py-2 pr-3 text-ink-2">{ACTION_LABELS[row.action]}</td>
                          <td className="py-2 pr-3">
                            <Input
                              type="number"
                              min={0}
                              max={240}
                              step={5}
                              value={String(o.minutes)}
                              aria-label={`Menit ${ARCHETYPE_LABELS[row.archetype]}`}
                              onChange={(e) => setOverride(row, "minutes", clamp(e.target.valueAsNumber, 0, 240))}
                            />
                          </td>
                          <td className="py-2">
                            <Input
                              type="number"
                              min={0}
                              max={1}
                              step={0.1}
                              value={String(o.effectiveness)}
                              aria-label={`Efektivitas ${ARCHETYPE_LABELS[row.archetype]}`}
                              onChange={(e) => setOverride(row, "effectiveness", clamp(e.target.valueAsNumber, 0, 1))}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

/**
 * One column per advisor, filled from the plan's board: capacity never overflows a column, and whoever does not fit
 * waits below the line. Cards settle in again whenever capacity changes.
 */
function AdvisorBoard({ plan, revision }: { plan: PlanResult; revision: number }) {
  const s = plan.summary;
  return (
    <Section
      title="Papan konselor minggu ini"
      description="Setiap kolom mewakili satu konselor dan berisi contoh mahasiswa per tindakan, diurutkan dari nilai harapan tertinggi per menit."
      actions={
        <ul aria-label="Arti warna titik" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-3">
          {TIER_ORDER.slice(0, 3).map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <TierDot tier={t} />
              {TIER_LABELS[t]}
            </li>
          ))}
        </ul>
      }
    >
      {plan.board.columns.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-3">
          Tanpa jam konselor, hanya {fmtInt(s.automated_contacts)} pesan otomatis yang terkirim. Tambah konselor untuk mengisi papan.
        </p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(212px,1fr))] gap-3">
          {plan.board.columns.map((c) => (
            <AdvisorColumn key={`${revision}-${c.advisor}`} column={c} />
          ))}
        </div>
      )}
      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-dashed border-line-strong pt-4 text-sm">
        <p className="text-ink-2">
          <b className="font-semibold text-ink tabular-nums">{fmtInt(s.advisor_contacts)}</b> dihubungi konselor,{" "}
          <b className="font-semibold text-ink tabular-nums">{fmtInt(s.automated_contacts)}</b> dapat pesan otomatis
        </p>
        <p className="text-ink-3">
          Di bawah garis ada <b className="font-semibold text-ink tabular-nums">{fmtInt(s.unassigned)}</b> mahasiswa ter-flag yang menunggu kapasitas
          {plan.board.unplaced > 0 && <>, {fmtInt(plan.board.unplaced)} di antaranya muat di total jam tapi tidak utuh di satu konselor</>}.
        </p>
      </div>
    </Section>
  );
}

function AdvisorColumn({ column: c }: { column: PlanResult["board"]["columns"][number] }) {
  const leftMinutes = c.capacity_minutes - c.minutes_used;
  const more = c.students - c.top.length;
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-2xl bg-surface-secondary p-3">
      <div className="px-1">
        <h3 className="text-sm font-semibold text-ink">Konselor {c.advisor}</h3>
        <p className="text-xs text-ink-3 tabular-nums">
          {fmtInt(c.students)} kontak, {fmtNum(c.minutes_used / 60, 1)}/{fmtNum(c.capacity_minutes / 60, 0)} jam
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white" aria-hidden>
          <span className="block h-full rounded-full bg-blue" style={{ width: `${Math.min(100, (c.minutes_used / (c.capacity_minutes || 1)) * 100)}%` }} />
        </div>
        <p className="mt-2 flex flex-wrap gap-x-3 text-xs text-ink-3" aria-label="Tier di kolom ini">
          {TIER_ORDER.filter((t) => c.tiers[t] > 0).map((t) => (
            <span key={t} className="flex items-center gap-1">
              <TierDot tier={t} />
              <span className="sr-only">{TIER_LABELS[t]}</span>
              <span className="tabular-nums">{fmtInt(c.tiers[t])}</span>
            </span>
          ))}
        </p>
      </div>
      <ul className="flex flex-col gap-1.5">
        {c.top.map((st, i) => (
          <li key={st.id} className="rise" style={{ "--i": c.advisor + i } as React.CSSProperties}>
            <Link
              href={`/mahasiswa/${st.id}`}
              className="group flex items-center gap-2.5 rounded-xl bg-white px-3 py-2 shadow-[0_1px_2px_rgb(11_27_58/0.06)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lift"
            >
              <TierDot tier={st.tier} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <b className="font-mono text-[13px] font-semibold text-ink">{st.source_id ?? st.id}</b>
                  <span className="text-[13px] font-semibold text-ink tabular-nums">
                    <span className="sr-only">{TIER_LABELS[st.tier]}, probabilitas </span>
                    {fmtProb(st.probability)}
                  </span>
                </span>
                <span className="block truncate text-xs text-ink-3">
                  {st.code_module ? `${fmtModule(st.code_module)}, ` : ""}
                  {ACTION_LABELS[st.action] ?? st.action}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {more > 0 && <p className="px-1 text-xs text-ink-3">+{fmtInt(more)} mahasiswa lagi di kolom ini</p>}
      {leftMinutes >= 15 && (
        <div className="grid h-10 place-items-center rounded-xl border border-dashed border-line-strong text-xs text-ink-3">
          Sisa {fmtInt(leftMinutes)} menit
        </div>
      )}
    </div>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo;
}

function Stepper({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (v: number) => void }) {
  return (
    <NumberField value={value} minValue={0} maxValue={max} onChange={(v) => onChange(Number.isFinite(v) ? v : 0)} className="flex w-52 flex-col gap-1.5">
      <Label className="text-[13px] font-medium text-ink-2">{label}</Label>
      <NumberField.Group className="h-11">
        <NumberField.DecrementButton aria-label={`Kurangi ${label.toLowerCase()}`} />
        <NumberField.Input className="text-center text-base font-semibold tabular-nums" />
        <NumberField.IncrementButton aria-label={`Tambah ${label.toLowerCase()}`} />
      </NumberField.Group>
    </NumberField>
  );
}
