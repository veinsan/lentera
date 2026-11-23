"use client";

import { useState, useTransition } from "react";
import { Checkbox, Spinner } from "@heroui/react";
import { FlaskConical } from "lucide-react";
import { Num } from "@/components/domain/stat";
import type { Counterfactual } from "@/lib/api";
import { postJson } from "@/lib/api-browser";
import { fmtPct } from "@/lib/format";

type SimResult = { applicable: boolean; probability: number | null; flagged?: boolean };

/** Model scenarios for one student. Always labelled as a model scenario, not a causal effect. */
export function ScenarioPanel({ studentId, cf }: { studentId: number; cf: Counterfactual }) {
  const helpful = new Set(cf.single.map((s) => s.lever));
  const [chosen, setChosen] = useState<string[]>([]);
  const [result, setResult] = useState<SimResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toggle(lever: string) {
    const next = chosen.includes(lever) ? chosen.filter((l) => l !== lever) : [...chosen, lever];
    setChosen(next);
    setError(null);
    if (next.length === 0) return setResult(null);
    start(async () => {
      const res = await postJson<SimResult>(`/students/${studentId}/simulate`, { levers: next });
      if (res.status === 200) setResult(res.body as SimResult);
      else setError("Simulasi gagal dijalankan karena API model belum menjawab. Coba lagi.");
    });
  }

  return (
    <div className="rounded-2xl border border-dashed border-uncertain bg-surface-secondary p-5">
      <p className="flex items-center gap-2 text-xs font-semibold text-ink-2">
        <FlaskConical className="size-4" aria-hidden />
        Skenario model, bukan efek kausal
      </p>

      {!cf.applicable ? (
        <p className="mt-3 text-sm leading-relaxed text-ink">
          Data aktivitas LMS mahasiswa ini berupa placeholder, jadi skenario perubahan perilaku tidak bisa dihitung. Lakukan cek
          administrasi dan akses terlebih dahulu.
        </p>
      ) : (
        <>
          <div className="mt-3 text-sm leading-relaxed text-ink">
            {cf.best ? (
              <p>
                <span className="font-semibold">{cf.best.labels.join(" + ")}</span> menurunkan probabilitas dari <Prob v={cf.base} /> ke{" "}
                <Prob v={cf.best.probability} />, di bawah ambang.
              </p>
            ) : cf.reason === "not_flagged" ? (
              <p>Mahasiswa ini sudah di bawah ambang {fmtPct(cf.threshold, 1)}.</p>
            ) : cf.closest ? (
              <p>
                <span className="font-semibold">Belum ada kombinasi yang menembus ambang.</span> Penurunan terbesar datang dari{" "}
                {cf.closest.labels.join(" + ")}, yaitu dari <Prob v={cf.base} /> ke <Prob v={cf.closest.probability} />.
              </p>
            ) : (
              <p>Tidak ada lever yang menurunkan risiko mahasiswa ini menurut model.</p>
            )}
          </div>

          <fieldset className="mt-5">
            <legend className="text-xs font-semibold text-ink-2">Coba kombinasi sendiri</legend>
            <div className="mt-2.5 flex flex-col gap-2">
              {cf.levers.map((l) => {
                const usable = helpful.has(l.key);
                return (
                  <Checkbox
                    key={l.key}
                    isSelected={chosen.includes(l.key)}
                    isDisabled={!usable || pending}
                    onChange={() => toggle(l.key)}
                  >
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    <Checkbox.Content>
                      <span className={usable ? "text-sm text-ink" : "text-sm text-ink-3"}>
                        {l.label}
                        {!usable && <span className="text-xs"> (tidak menurunkan risiko mahasiswa ini)</span>}
                      </span>
                    </Checkbox.Content>
                  </Checkbox>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-separator pt-4 text-sm" aria-live="polite">
            <span className="text-ink-3">Probabilitas skenario</span>
            {pending ? (
              <Spinner size="sm" />
            ) : result?.probability != null ? (
              <>
                <span className="numeral text-[1.6rem] text-blue">
                  <Num value={result.probability} format="pct" />
                </span>
                <span className="text-xs text-ink-3">
                  dari {fmtPct(cf.base)}, {result.flagged ? "masih ter-flag" : "di bawah ambang"}
                </span>
              </>
            ) : (
              <span className="text-ink-3">pilih lever di atas</span>
            )}
          </div>
          {error && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Prob({ v }: { v: number }) {
  return <span className="font-semibold tabular-nums">{fmtPct(v)}</span>;
}
