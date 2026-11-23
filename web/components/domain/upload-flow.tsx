"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FileUp } from "lucide-react";
import { KpiCard } from "@/components/domain/kpi-card";
import { QualityReportView } from "@/components/domain/quality-report";
import { TierBadge } from "@/components/domain/tier-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CohortSummary, QualityReport, Tier } from "@/lib/api";
import { postFile } from "@/lib/api-browser";
import { fmtInt, fmtModule } from "@/lib/format";
import { ARCHETYPE_LABELS } from "@/lib/labels";

type Created = { cohort_id: string; summary: CohortSummary; quality_report: QualityReport; seconds: number };
const TIERS: Tier[] = ["critical", "high", "watch", "low"];

function errorText(body: unknown): string {
  const detail = (body as { detail?: unknown })?.detail;
  return typeof detail === "string" ? detail : "Permintaan gagal.";
}

export function UploadFlow() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
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
      <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-[1fr_1fr_auto]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="file">File CSV minggu ke-4</Label>
          <Input id="file" type="file" accept=".csv,text/csv" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Nama kohort</Label>
          <Input id="name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button onClick={validate} disabled={!file || pending} variant="outline">
          <FileUp aria-hidden />
          {pending && step === "validate" ? "Memeriksa..." : "Periksa kualitas data"}
        </Button>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {report && !created && (
        <>
          <QualityReportView report={report} />
          {report.can_score && (
            <div className="flex items-center justify-end gap-3">
              <p className="text-sm text-muted-foreground">Model akan menilai {fmtInt(report.rows)} mahasiswa dan menyimpan hasilnya.</p>
              <Button onClick={score} disabled={pending || !name.trim()} className="hover:bg-primary-hover">
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
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Kohort tersimpan dan dinilai dalam {created.seconds.toLocaleString("id-ID")} detik.
      </p>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Mahasiswa dinilai" value={fmtInt(s.rows)} />
        <KpiCard highlight label="Ter-flag (threshold 0,375)" value={fmtInt(s.flagged)} />
        <KpiCard label="Perkiraan benar-benar berisiko" value={fmtInt(s.expected_at_risk)} note="Jumlah probabilitas terkalibrasi" />
        <KpiCard label="Di zona tidak pasti" value={fmtInt(s.uncertain)} note="Probabilitas 0,25 sampai 0,55" />
      </div>
      <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
        <List title="Tier" rows={TIERS.map((t) => [<TierBadge key={t} tier={t} />, s.tiers[t]])} />
        <List title="Archetype" rows={Object.entries(s.archetypes).map(([a, n]) => [ARCHETYPE_LABELS[a] ?? a, n])} />
        <List title="Modul" rows={Object.entries(s.modules).map(([m, n]) => [fmtModule(m), n])} />
      </div>
      <div className="flex justify-end gap-3">
        <Link href="/prioritas" className={buttonVariants({ variant: "outline" })}>
          Lihat daftar prioritas
        </Link>
        <Link href="/dashboard" className={buttonVariants({ className: "hover:bg-primary-hover" })}>
          Buka dashboard
        </Link>
      </div>
    </div>
  );
}

function List({ title, rows }: { title: string; rows: [React.ReactNode, number][] }) {
  return (
    <div className="rounded-xl border p-3">
      <p className="mb-2 text-xs font-semibold text-muted-foreground">{title}</p>
      <ul className="flex flex-col gap-1.5">
        {rows.map(([label, n], i) => (
          <li key={i} className="flex items-center justify-between">
            <span>{label}</span>
            <span className="font-mono tabular-nums">{fmtInt(n)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
