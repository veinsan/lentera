"use client";

import { useEffect, useRef, useState } from "react";
import { Label, NumberField } from "@heroui/react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Num } from "@/components/domain/stat";
import type { PlanResult } from "@/lib/api";
import { postJson } from "@/lib/api-browser";
import { fmtInt } from "@/lib/format";

const DEBOUNCE_MS = 250;

/**
 * Capacity at a glance: advisors and hours remap the lit band (students reached this week) live.
 * The lit band is what capacity reaches; shadow blue is the queue (daylight-section raise in the surface brief).
 */
export function CapacityGlance({ cohortId }: { cohortId: string }) {
  const [advisors, setAdvisors] = useState(5);
  const [hours, setHours] = useState(10);
  const [plan, setPlan] = useState<PlanResult["summary"] | null>(null);
  const [error, setError] = useState(false);
  const request = useRef(0);

  useEffect(() => {
    const id = ++request.current;
    const timer = setTimeout(async () => {
      const res = await postJson<PlanResult>("/plans/preview", { cohort_id: cohortId, advisors, hours_per_advisor: hours, overrides: {} });
      if (id !== request.current) return;
      if (res.status === 200) {
        setPlan((res.body as PlanResult).summary);
        setError(false);
      } else setError(true);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [advisors, hours, cohortId]);

  const total = plan ? plan.advisor_contacts + plan.automated_contacts + plan.unassigned : 1;
  return (
    <section className="plate flex flex-col gap-5 p-5 sm:p-6" aria-busy={!plan}>
      <header>
        <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">Kapasitas minggu ini</h2>
        <p className="mt-1 text-sm text-ink-3">Ubah jumlah konselor dan jam, lalu jangkauan dihitung ulang dari probabilitas terkalibrasi.</p>
      </header>
      <div className="grid grid-cols-2 gap-3">
        <Stepper label="Konselor" value={advisors} max={24} onChange={setAdvisors} />
        <Stepper label="Jam per minggu" value={hours} max={40} onChange={setHours} />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          Rencana gagal dihitung karena API model belum menjawab. Coba lagi sebentar lagi.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[13px] text-ink-3">Berisiko terjangkau konselor</p>
              <p className="numeral mt-1 text-[2.4rem] text-blue">{plan ? <Num value={plan.expected_at_risk_reached_advisor} /> : "..."}</p>
            </div>
            <div>
              <p className="text-[13px] text-ink-3">Per konselor tambahan</p>
              <p className="numeral mt-1 text-[2.4rem]">{plan ? <Num value={plan.marginal_per_advisor} prefix="+" /> : "..."}</p>
            </div>
          </div>
          <div>
            <div className="flex h-3 overflow-hidden rounded-full bg-queue-track" role="img" aria-label="Mahasiswa ter-flag yang tertangani minggu ini">
              {plan && (
                <>
                  <span className="bg-blue transition-[flex-grow] duration-500 ease-out-expo" style={{ flexGrow: plan.advisor_contacts / total }} />
                  <span className="bg-starlight transition-[flex-grow] duration-500 ease-out-expo" style={{ flexGrow: plan.automated_contacts / total }} />
                  <span className="transition-[flex-grow] duration-500 ease-out-expo" style={{ flexGrow: plan.unassigned / total }} />
                </>
              )}
            </div>
            {plan && (
              <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-3">
                <li className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-blue" />
                  Telepon <b className="text-ink tabular-nums">{fmtInt(plan.advisor_contacts)}</b>
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-starlight" />
                  Otomatis <b className="text-ink tabular-nums">{fmtInt(plan.automated_contacts)}</b>
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-queue-track ring-1 ring-line-strong" />
                  Menunggu <b className="text-ink tabular-nums">{fmtInt(plan.unassigned)}</b>
                </li>
              </ul>
            )}
          </div>
        </>
      )}
      <Link href="/rencana" className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-blue-ink hover:underline">
        Buka papan konselor dan playbook <ArrowRight className="size-4" aria-hidden />
      </Link>
    </section>
  );
}

function Stepper({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (v: number) => void }) {
  return (
    <NumberField value={value} minValue={0} maxValue={max} onChange={(v) => onChange(Number.isFinite(v) ? v : 0)} className="flex flex-col gap-1.5">
      <Label className="text-[13px] font-normal text-ink-3">{label}</Label>
      <NumberField.Group className="h-11">
        <NumberField.DecrementButton aria-label={`Kurangi ${label.toLowerCase()}`} />
        <NumberField.Input className="text-center text-base font-semibold tabular-nums" />
        <NumberField.IncrementButton aria-label={`Tambah ${label.toLowerCase()}`} />
      </NumberField.Group>
    </NumberField>
  );
}
