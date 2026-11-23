import { CircleCheck, OctagonAlert, TriangleAlert } from "lucide-react";
import { DriftChart } from "@/components/charts/drift-chart";
import { ApiError } from "@/components/domain/api-error";
import { EmptyState } from "@/components/domain/empty-state";
import { Section } from "@/components/domain/section";
import { Stat } from "@/components/domain/stat";
import { DataTable } from "@/components/ui/data-table";
import { getRequestStats, type DriftStatus } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getLatestDrift } from "@/lib/data";
import { fmtInt, fmtNum, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";

// Drift state is a glyph plus a word; colour only repeats it.
const STATUS = {
  stable: { label: "Stabil", icon: CircleCheck, className: "text-success" },
  moderate: { label: "Perlu dipantau", icon: TriangleAlert, className: "text-ink" },
  shift: { label: "Bergeser", icon: OctagonAlert, className: "text-danger" },
} as const;

function DriftBadge({ status }: { status: DriftStatus }) {
  const s = STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[13px] font-semibold", s.className)}>
      <s.icon className="size-4" aria-hidden />
      {s.label}
    </span>
  );
}

export async function DriftPanel() {
  const latest = await getLatestDrift();
  const drift = latest?.drift;
  if (!latest || !drift) {
    return <EmptyState title="Belum ada laporan drift" description="Drift dihitung setiap kali kohort diunggah dan dinilai." />;
  }
  const { moderate, shift } = drift.thresholds;
  const shifted = drift.features.filter((f) => f.status === "shift");
  return (
    <Section
      title="Drift data"
      description={`${latest.name}: ${fmtInt(drift.n)} mahasiswa dibandingkan dengan ${fmtInt(drift.reference_n)} baris train. PSI di bawah ${fmtNum(moderate, 1)} stabil, ${fmtNum(moderate, 1)} sampai ${fmtNum(shift, 1)} perlu dipantau, di atas ${fmtNum(shift, 1)} bergeser.`}
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="flex flex-col gap-3">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2">
            <span>
              PSI probabilitas prediksi <b className="font-semibold text-ink tabular-nums">{fmtNum(drift.probability.psi, 3)}</b>
            </span>
            <DriftBadge status={drift.probability.status} />
          </p>
          <DriftChart bins={drift.probability.bins} />
          <p className="text-xs leading-relaxed text-ink-3">
            {shifted.length === 0
              ? "Tidak ada fitur yang bergeser, jadi metrik validasi di halaman ini berlaku untuk kohort ini."
              : `${shifted.length} fitur bergeser. Metrik validasi mungkin tidak berlaku penuh; periksa apakah kohort hanya berisi sebagian modul atau ada perubahan cara data dicatat.`}
          </p>
        </div>
        <DataTable
          label="Drift per fitur"
          dense
          rows={drift.features}
          rowId={(f) => f.feature}
          columns={[
            { id: "f", label: "Fitur", rowHeader: true, className: "whitespace-normal", cell: (f) => f.label },
            { id: "psi", label: "PSI", align: "end", cell: (f) => fmtNum(f.psi, 3) },
            { id: "s", label: "Status", cell: (f) => <DriftBadge status={f.status} /> },
            {
              id: "m",
              label: "Kosong (train / kohort)",
              align: "end",
              cell: (f) =>
                f.missing_reference != null && f.missing_reference + (f.missing_current ?? 0) > 0
                  ? `${fmtPct(f.missing_reference, 1)} / ${fmtPct(f.missing_current, 1)}`
                  : "-",
            },
          ]}
        />
      </div>
    </Section>
  );
}

const DAYS = 7;

export async function RequestPanel() {
  const user = await getCurrentUser();
  if (user.role === "advisor") return null; // request statistics are for coordinators and admins
  const res = await getRequestStats(DAYS, user.accessToken);
  if (!res.ok) return <ApiError />;
  if (res.data.total === 0) return <EmptyState title="Belum ada request tercatat" description="Setiap panggilan API menulis satu baris log." />;
  return (
    <Section title="Kesehatan API" description={`Semua panggilan ke API model dalam ${DAYS} hari terakhir, kecuali health check.`}>
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          <Stat label="Request" value={res.data.total} note={`${fmtInt(res.data.client_errors)} ditolak (4xx)`} />
          <Stat label="Error server (5xx)" value={res.data.error_rate ?? 0} format="pct1" note={`${fmtInt(res.data.server_errors)} request`} />
          <Stat label="Latency p50 (ms)" value={res.data.latency_ms?.p50 ?? null} note="waktu proses di API" />
          <Stat label="Latency p95 (ms)" value={res.data.latency_ms?.p95 ?? null} note="5% request paling lambat" />
        </div>
        <DataTable
          label="Request per endpoint"
          rows={res.data.endpoints}
          rowId={(e) => e.endpoint}
          columns={[
            { id: "e", label: "Endpoint", rowHeader: true, cell: (e) => <span className="font-mono text-xs">{e.endpoint}</span> },
            { id: "n", label: "Request", align: "end", cell: (e) => fmtInt(e.requests) },
            { id: "4", label: "4xx", align: "end", cell: (e) => fmtInt(e.client_errors) },
            {
              id: "5",
              label: "5xx",
              align: "end",
              cell: (e) => <span className={cn(e.server_errors > 0 && "font-semibold text-danger")}>{fmtInt(e.server_errors)}</span>,
            },
            { id: "p50", label: "p50 (ms)", align: "end", cell: (e) => fmtInt(e.p50) },
            { id: "p95", label: "p95 (ms)", align: "end", cell: (e) => fmtInt(e.p95) },
          ]}
        />
      </div>
    </Section>
  );
}
