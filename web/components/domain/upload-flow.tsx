"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Input, Label, TextField } from "@heroui/react";
import { FileSpreadsheet, FileUp } from "lucide-react";
import { QualityReportView } from "@/components/domain/quality-report";
import { Stat } from "@/components/domain/stat";
import { TierBadge } from "@/components/domain/tier-badge";
import { LinkButton } from "@/components/ui/link-button";
import type { CohortSummary, QualityReport, Tier } from "@/lib/api";
import { postFile } from "@/lib/api-browser";
import { fmtInt, fmtModule } from "@/lib/format";
import { ARCHETYPE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

type Created = { cohort_id: string; summary: CohortSummary; quality_report: QualityReport; seconds: number };
const TIERS: Tier[] = ["critical", "high", "watch", "low"];

function errorText(body: unknown): string {
  const detail = (body as { detail?: unknown })?.detail;
  return typeof detail === "string" ? detail : "Permintaan gagal. Periksa koneksi ke API model, lalu coba lagi.";
}

export function UploadFlow() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [over, setOver] = useState(false);
  const [report, setReport] = useState<QualityReport | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [step, setStep] = useState<"validate" | "score" | null>(null);

  function pick(f: File | null) {
    setFile(f);
    setReport(null);
    setCreated(null);
    setError(null);
    if (f && !name) setName(`Kohort ${f.name.replace(/\.csv$/i, "")}`);
  }

  function validate() {
    if (!file) return;
    setStep("validate");
    start(async () => {
      setError(null);
      const res = await postFile<QualityReport>("/cohorts/validate", file);
      if (res.status === 200) setReport(res.body as QualityReport);
      else setError(errorText(res.body));
    });
  }

  function score() {
    if (!file) return;
    setStep("score");
    start(async () => {
      setError(null);
      const res = await postFile<Created>("/cohorts", file, { name });
      if (res.status === 200) {
        setCreated(res.body as Created);
        router.refresh(); // refresh the cohort list
      } else {
        const body = res.body as { quality_report?: QualityReport };
        if (body.quality_report) setReport(body.quality_report);
        setError(errorText(res.body));
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            pick(e.dataTransfer.files?.[0] ?? null);
          }}
          className={cn(
            "flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed px-6 py-6 text-center transition-colors",
            over ? "border-blue bg-blue-soft" : "border-line-strong bg-surface-secondary hover:border-blue/60",
          )}
        >
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          {file ? (
            <>
              <FileSpreadsheet className="size-7 text-blue" aria-hidden />
              <span className="text-sm font-semibold text-ink">{file.name}</span>
              <span className="text-xs text-ink-3">{fmtInt(file.size / 1024)} KB · klik atau seret file lain untuk mengganti</span>
            </>
          ) : (
            <>
              <FileUp className="size-7 text-ink-3" aria-hidden />
              <span className="text-sm font-semibold text-ink">Seret CSV minggu ke-4 ke sini, atau klik untuk memilih</span>
              <span className="text-xs text-ink-3">Skema sama dengan test.csv DSCO</span>
            </>
          )}
        </label>
        <div className="flex flex-col justify-end gap-4">
          <TextField value={name} onChange={setName} maxLength={120} className="flex flex-col gap-1.5">
            <Label className="text-[13px] font-medium text-ink-2">Nama kohort</Label>
            <Input placeholder="Misalnya Kohort minggu ke-4 semester ini" />
          </TextField>
          <Button onPress={validate} isDisabled={!file} isPending={pending && step === "validate"} variant="secondary">
            {pending && step === "validate" ? "Memeriksa..." : "Periksa kualitas data"}
          </Button>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger-soft-foreground">
          {error}
        </p>
      )}

      {report && !created && (
        <>
          <QualityReportView report={report} />
          {report.can_score && (
            <div className="flex flex-wrap items-center justify-end gap-3">
              <p className="text-sm text-ink-3">Model akan menilai {fmtInt(report.rows)} mahasiswa dan menyimpan hasilnya.</p>
              <Button onPress={score} isDisabled={!name.trim()} isPending={pending && step === "score"}>
                {pending && step === "score" ? "Menilai kohort..." : "Nilai kohort"}
              </Button>
            </div>
          )}
        </>
      )}

      {created && <Result created={created} />}
    </div>
  );
}

function Result({ created }: { created: Created }) {
  const s = created.summary;
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-ink-2">Kohort tersimpan dan dinilai dalam {created.seconds.toLocaleString("id-ID")} detik.</p>
      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        <Stat label="Mahasiswa dinilai" value={s.rows} />
        <Stat label="Ter-flag" value={s.flagged} tone="blue" />
        <Stat label="Perkiraan benar-benar berisiko" value={s.expected_at_risk} note="jumlah probabilitas terkalibrasi" />
        <Stat label="Zona tidak pasti" value={s.uncertain} note="perlu tinjauan konselor" />
      </div>
      <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
        <List title="Tier" rows={TIERS.map((t) => [<TierBadge key={t} tier={t} />, s.tiers[t]])} />
        <List title="Archetype" rows={Object.entries(s.archetypes).map(([a, n]) => [ARCHETYPE_LABELS[a] ?? a, n])} />
        <List title="Modul" rows={Object.entries(s.modules).map(([m, n]) => [fmtModule(m), n])} />
      </div>
      <div className="flex justify-end gap-3">
        <LinkButton href="/prioritas" variant="secondary">
          Lihat daftar prioritas
        </LinkButton>
        <LinkButton href="/dashboard">Buka X-Ray kohort</LinkButton>
      </div>
    </div>
  );
}

function List({ title, rows }: { title: string; rows: [React.ReactNode, number][] }) {
  return (
    <div className="rounded-2xl bg-surface-secondary p-4">
      <p className="mb-2 text-xs font-semibold text-ink-3">{title}</p>
      <ul className="flex flex-col gap-1.5">
        {rows.map(([label, n], i) => (
          <li key={i} className="flex items-center justify-between text-ink">
            <span>{label}</span>
            <span className="font-semibold tabular-nums">{fmtInt(n)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
