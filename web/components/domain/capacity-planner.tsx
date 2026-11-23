"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { FlaskConical, Info } from "lucide-react";
import { ReachCurveChart } from "@/components/charts/reach-curve-chart";
import { KpiCard } from "@/components/domain/kpi-card";
import { Section } from "@/components/domain/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PlanResult, PlaybookRow } from "@/lib/api";
import { postJson } from "@/lib/api-browser";
import { fmtInt, fmtNum, fmtPct, fmtProb } from "@/lib/format";
import { ACTION_LABELS, ARCHETYPE_LABELS } from "@/lib/labels";

type Overrides = Record<string, { minutes: number; effectiveness: number }>;
const CHANNEL_LABELS = { advisor: "Konselor", automated: "Otomatis", unassigned: "Belum terjangkau" } as const;
const DEBOUNCE_MS = 300;

export function CapacityPlanner({ cohortId }: { cohortId: string }) {
  const router = useRouter();
  const [advisors, setAdvisors] = useState(5);
  const [hours, setHours] = useState(10);
  const [defaults, setDefaults] = useState<PlaybookRow[] | null>(null);
  const [overrides, setOverrides] = useState<Overrides>({});
  const [result, setResult] = useState<PlanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
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
        setError(null);
        setDefaults((d) => d ?? plan.playbook);
      } else setError("Rencana gagal dihitung. Periksa angka yang dimasukkan.");
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // body is rebuilt from these values on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advisors, hours, overrides, cohortId]);

  function setOverride(row: PlaybookRow, key: "minutes" | "effectiveness", value: number) {
    const current = overrides[row.archetype] ?? { minutes: row.minutes, effectiveness: row.effectiveness };
    setOverrides({ ...overrides, [row.archetype]: { ...current, [key]: value } });
    setSaved(null);
  }

  function save() {
    startSave(async () => {
      const res = await postJson<{ id: number }>("/plans", body);
      if (res.status === 200) {
        setSaved(`Rencana #${(res.body as { id: number }).id} tersimpan.`);
        router.refresh();
      } else setError("Rencana gagal disimpan.");
    });
  }

  const s = result?.summary;
  const capacityHours = advisors * hours;

  return (
    <div className="flex flex-col gap-6">
      <Section title="Kapasitas konselor" description="Berapa banyak waktu konselor yang tersedia untuk kohort ini per minggu.">
        <div className="flex flex-wrap items-end gap-4">
          <NumberField id="advisors" label="Jumlah konselor" value={advisors} min={0} max={200} step={1} onChange={(v) => { setAdvisors(v); setSaved(null); }} />
          <NumberField id="hours" label="Jam per konselor per minggu" value={hours} min={0} max={80} step={1} onChange={(v) => { setHours(v); setSaved(null); }} />
          <p className="pb-2 text-sm text-muted-foreground">
            = <span className="font-mono font-semibold text-foreground">{fmtInt(capacityHours)}</span> jam konselor per minggu
          </p>
          <Button onClick={save} disabled={!result || saving} className="ml-auto hover:bg-primary-hover">
            {saving ? "Menyimpan..." : "Simpan rencana"}
          </Button>
        </div>
        {saved && <p role="status" className="mt-3 text-sm text-success">{saved}</p>}
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      </Section>

      {!s ? (
        <p className="text-sm text-muted-foreground">Menghitung rencana...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <KpiCard label="Dihubungi konselor" value={fmtInt(s.advisor_contacts)} note={`${fmtInt(s.minutes_used / 60)} dari ${fmtInt(capacityHours)} jam terpakai`} />
            <KpiCard
              highlight
              label="Perkiraan berisiko terjangkau konselor"
              value={fmtInt(s.expected_at_risk_reached_advisor)}
              note={s.advisor_mean_probability != null ? `Rata-rata probabilitas ${fmtProb(s.advisor_mean_probability)}` : undefined}
            />
            <KpiCard label="Cakupan" value={fmtPct(s.advisor_coverage, 1)} note={`dari ${fmtInt(s.expected_at_risk_cohort)} perkiraan berisiko di kohort`} />
            <KpiCard label="Pesan otomatis" value={fmtInt(s.automated_contacts)} note={`${fmtInt(s.expected_at_risk_reached_automated)} perkiraan berisiko`} />
            <KpiCard label="Belum terjangkau" value={fmtInt(s.unassigned)} note="Ter-flag, butuh konselor, belum masuk kapasitas" />
          </div>

          <div className="sheet flex items-start gap-3 px-5 py-4 text-sm">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <p>
              Menambah 1 konselor ({fmtInt(hours)} jam) menjangkau sekitar{" "}
              <span className="font-mono font-semibold">+{fmtInt(s.marginal_per_advisor)}</span> mahasiswa berisiko lagi.
              Perkiraan memakai probabilitas terkalibrasi (ECE 0,0075), bukan jumlah mahasiswa yang pasti tertolong.
            </p>
          </div>

          {s.is_scenario && (
            <div className="rounded-2xl border border-dashed border-uncertain bg-muted p-5 text-sm">
              <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <FlaskConical className="size-4" aria-hidden />
                Skenario model, bukan efek kausal
              </p>
              <p className="mt-2">
                Dengan asumsi efektivitas di bawah, perkiraan mahasiswa berisiko yang tertolong:{" "}
                <span className="font-mono text-lg font-semibold">{fmtInt(s.estimated_retained_scenario)}</span>. Angka ini
                bergantung sepenuhnya pada asumsi efektivitas.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
            <Section title="Kurva jangkauan" description="Perkiraan mahasiswa berisiko yang terjangkau konselor untuk setiap tambahan jam.">
              <ReachCurveChart curve={result.curve} currentHours={capacityHours} />
            </Section>
            <Section title="Alokasi intervensi" description="Satu intervensi playbook per mahasiswa ter-flag.">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Intervensi</TableHead>
                    <TableHead>Kanal</TableHead>
                    <TableHead className="text-right">Mhs</TableHead>
                    <TableHead className="text-right">Berisiko</TableHead>
                    <TableHead className="text-right">Jam</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {s.per_action.map((a) => (
                    <TableRow key={`${a.action}-${a.channel}`} className={a.channel === "unassigned" ? "text-muted-foreground" : undefined}>
                      <TableCell className="whitespace-normal">{ACTION_LABELS[a.action] ?? a.action}</TableCell>
                      <TableCell className="text-xs">{CHANNEL_LABELS[a.channel]}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{fmtInt(a.students)}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{fmtInt(a.expected_at_risk)}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{a.channel === "advisor" ? fmtNum(a.minutes / 60, 1) : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>
          </div>

          {defaults && (
            <Section
              title="Asumsi playbook"
              description="Menit konselor dan efektivitas per archetype. Efektivitas 1,0 berarti semua intervensi dianggap sama efektif, sehingga planner memprioritaskan cek singkat untuk mahasiswa Senyap. Turunkan efektivitas bila mahasiswa Senyap kemungkinan sudah mundur."
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Archetype</TableHead>
                    <TableHead>Intervensi</TableHead>
                    <TableHead className="w-32">Menit konselor</TableHead>
                    <TableHead className="w-32">Efektivitas (0 sampai 1)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {defaults.map((row) => {
                    const o = overrides[row.archetype] ?? row;
                    return (
                      <TableRow key={row.archetype}>
                        <TableCell>{ARCHETYPE_LABELS[row.archetype]}</TableCell>
                        <TableCell className="text-xs">{ACTION_LABELS[row.action]}</TableCell>
                        <TableCell>
                          <Input type="number" min={0} max={240} step={5} value={o.minutes} aria-label={`Menit ${ARCHETYPE_LABELS[row.archetype]}`}
                            onChange={(e) => setOverride(row, "minutes", clamp(e.target.valueAsNumber, 0, 240))} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" min={0} max={1} step={0.1} value={o.effectiveness} aria-label={`Efektivitas ${ARCHETYPE_LABELS[row.archetype]}`}
                            onChange={(e) => setOverride(row, "effectiveness", clamp(e.target.valueAsNumber, 0, 1))} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {Object.keys(overrides).length > 0 && (
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => setOverrides({})}>
                  Kembalikan ke default
                </Button>
              )}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo;
}

function NumberField({ id, label, value, min, max, step, onChange }: {
  id: string; label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex w-48 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(clamp(e.target.valueAsNumber, min, max))} />
    </div>
  );
}
