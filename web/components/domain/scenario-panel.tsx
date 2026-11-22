"use client";

import { useState, useTransition } from "react";
import { FlaskConical } from "lucide-react";
import type { Counterfactual } from "@/lib/api";
import { postJson } from "@/lib/api-browser";
import { fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";

type SimResult = { applicable: boolean; probability: number | null; flagged?: boolean };

/** Model scenarios for one student. Always labelled as a model scenario, not a causal effect (DESIGN.md). */
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
      else setError("Simulasi gagal dijalankan.");
    });
  }

  return (
    <div className="rounded-md border border-uncertain bg-muted p-4">
      <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <FlaskConical className="size-4" aria-hidden />
        Skenario model, bukan efek kausal
      </p>

      {!cf.applicable ? (
        <p className="mt-3 text-sm">
          Data aktivitas LMS mahasiswa ini berupa placeholder, jadi skenario perubahan perilaku tidak bisa dihitung. Lakukan
          cek administrasi dan akses terlebih dahulu.
        </p>
      ) : (
        <>
          <div className="mt-3 text-sm">
            {cf.best ? (
              <p>
                <span className="font-semibold">Jalur di bawah threshold:</span> {cf.best.labels.join(" + ")} menurunkan
                probabilitas dari <Prob v={cf.base} /> ke <Prob v={cf.best.probability} />.
              </p>
            ) : cf.reason === "not_flagged" ? (
              <p>Mahasiswa ini sudah di bawah threshold {fmtPct(cf.threshold, 1)}.</p>
            ) : cf.closest ? (
              <p>
                <span className="font-semibold">Belum ada kombinasi yang menembus threshold.</span> Penurunan terbesar:{" "}
                {cf.closest.labels.join(" + ")}, dari <Prob v={cf.base} /> ke <Prob v={cf.closest.probability} />.
              </p>
            ) : (
              <p>Tidak ada lever yang menurunkan risiko mahasiswa ini menurut model.</p>
            )}
          </div>

          <fieldset className="mt-4">
            <legend className="text-xs font-semibold text-muted-foreground">Coba kombinasi sendiri</legend>
            <div className="mt-2 flex flex-col gap-1.5">
              {cf.levers.map((l) => {
                const usable = helpful.has(l.key);
                return (
                  <label key={l.key} className={cn("flex items-center gap-2 text-sm", !usable && "text-muted-foreground")}>
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--primary)]"
                      checked={chosen.includes(l.key)}
                      disabled={!usable || pending}
                      onChange={() => toggle(l.key)}
                    />
                    {l.label}
                    {!usable && <span className="text-xs">(tidak menurunkan risiko mahasiswa ini)</span>}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-4 flex items-baseline gap-3 text-sm" aria-live="polite">
            <span className="text-muted-foreground">Probabilitas skenario:</span>
            {pending ? (
              <span className="text-muted-foreground">menghitung...</span>
            ) : result?.probability != null ? (
              <>
                <span className="font-mono text-xl font-semibold">{fmtPct(result.probability)}</span>
                <span className="text-xs text-muted-foreground">
                  dari {fmtPct(cf.base)} · {result.flagged ? "masih ter-flag" : "di bawah threshold"}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">pilih lever di atas</span>
            )}
          </div>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </>
      )}
    </div>
  );
}

function Prob({ v }: { v: number }) {
  return <span className="font-mono font-semibold">{fmtPct(v)}</span>;
}
