"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@heroui/react";
import { FileCheck2, FileUp } from "lucide-react";
import { Stat } from "@/components/domain/stat";
import { LinkButton } from "@/components/ui/link-button";
import type { OutcomeReport } from "@/lib/api";
import { postFile } from "@/lib/api-browser";
import { fmtInt } from "@/lib/format";
import { cn } from "@/lib/utils";

function errorText(body: unknown): string {
  const detail = (body as { detail?: unknown })?.detail;
  return typeof detail === "string" ? detail : "Permintaan gagal. Periksa koneksi ke API model, lalu coba lagi.";
}

/** Uploads the real outcomes (id, at_risk) of a scored cohort; the API stores only the aggregate evaluation. */
export function OutcomeUpload({ cohortId, cohortName }: { cohortId: string; cohortName: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<OutcomeReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function pick(f: File | null) {
    setFile(f);
    setReport(null);
    setError(null);
  }

  function upload() {
    if (!file) return;
    start(async () => {
      setError(null);
      const res = await postFile<OutcomeReport>(`/cohorts/${cohortId}/outcomes`, file);
      if (res.status === 200) {
        setReport(res.body as OutcomeReport);
        router.refresh();
      } else setError(errorText(res.body));
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <label
          className={cn(
            "flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed px-6 py-5 text-center transition-colors",
            "border-line-strong bg-surface-secondary hover:border-blue/60",
          )}
        >
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          {file ? (
            <>
              <FileCheck2 className="size-6 text-blue" aria-hidden />
              <span className="text-sm font-semibold text-ink">{file.name}</span>
              <span className="text-xs text-ink-3">klik untuk mengganti file</span>
            </>
          ) : (
            <>
              <FileUp className="size-6 text-ink-3" aria-hidden />
              <span className="text-sm font-semibold text-ink">Pilih CSV hasil akhir</span>
              <span className="text-xs text-ink-3">Kolom id dan at_risk (0 atau 1), id sama dengan CSV minggu ke-4</span>
            </>
          )}
        </label>
        <div className="flex flex-col justify-end gap-3">
          <p className="text-sm text-ink-3">
            Hasil akhir dicocokkan dengan prediksi <span className="font-semibold text-ink">{cohortName}</span>. Label per mahasiswa tidak disimpan.
          </p>
          <Button onPress={upload} isDisabled={!file} isPending={pending}>
            {pending ? "Mengecek prediksi..." : "Cek prediksi dengan hasil akhir"}
          </Button>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger-soft-foreground">
          {error}
        </p>
      )}

      {report && (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-ink-2">
            Sebanyak {fmtInt(report.coverage.matched)} dari {fmtInt(report.coverage.cohort)} mahasiswa punya label.
            {report.coverage.unknown_ids > 0 && <> Ada {fmtInt(report.coverage.unknown_ids)} id di file yang tidak ada di kohort ini.</>}
          </p>
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            <Stat label="F1" value={report.metrics.f1} format="dec4" tone="blue" />
            <Stat label="Presisi" value={report.metrics.precision} format="dec4" />
            <Stat label="Recall" value={report.metrics.recall} format="dec4" />
            <Stat label="Kalibrasi (ECE)" value={report.calibration.ece} format="dec4" />
          </div>
          <div className="flex justify-end">
            <LinkButton href="/model">Lihat evaluasi lengkap</LinkButton>
          </div>
        </div>
      )}
    </div>
  );
}
