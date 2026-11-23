import { Activity, CircleCheck, OctagonAlert, TriangleAlert } from "lucide-react";
import { DriftChart } from "@/components/charts/drift-chart";
import { ApiError } from "@/components/domain/api-error";
import { EmptyState } from "@/components/domain/empty-state";
import { KpiCard } from "@/components/domain/kpi-card";
import { Section } from "@/components/domain/section";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getRequestStats, type DriftStatus } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getLatestDrift } from "@/lib/data";
import { fmtInt, fmtNum, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS = {
  stable: { label: "Stabil", icon: CircleCheck, className: "text-success" },
  moderate: { label: "Perlu dipantau", icon: TriangleAlert, className: "text-foreground" },
  shift: { label: "Bergeser", icon: OctagonAlert, className: "text-destructive" },
} as const;

function DriftBadge({ status }: { status: DriftStatus }) {
  const s = STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", s.className)}>
      <s.icon className="size-3.5" aria-hidden />
      {s.label}
    </span>
  );
}

export async function DriftPanel() {
  const latest = await getLatestDrift();
  const drift = latest?.drift;
  if (!latest || !drift) {
    return (
      <Section title="Drift data" description="Perbandingan distribusi kohort dengan data train (PSI).">
        <EmptyState icon={Activity} title="Belum ada laporan drift" description="Drift dihitung setiap kali kohort diunggah dan dinilai." />
      </Section>
    );
  }
  const { moderate, shift } = drift.thresholds;
  const shifted = drift.features.filter((f) => f.status === "shift");
  return (
    <Section
      title="Drift data"
      description={`${latest.name}: ${fmtInt(drift.n)} mahasiswa dibandingkan dengan ${fmtInt(drift.reference_n)} baris train. PSI di bawah ${fmtNum(moderate, 1)} stabil, ${fmtNum(moderate, 1)} sampai ${fmtNum(shift, 1)} perlu dipantau, di atas ${fmtNum(shift, 1)} bergeser.`}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span>
              PSI probabilitas prediksi <span className="font-mono font-semibold">{fmtNum(drift.probability.psi, 3)}</span>
            </span>
            <DriftBadge status={drift.probability.status} />
          </p>
          <DriftChart bins={drift.probability.bins} />
          <p className="text-xs text-muted-foreground">
            {shifted.length === 0
              ? "Tidak ada fitur yang bergeser, jadi metrik validasi di halaman ini berlaku untuk kohort ini."
              : `${shifted.length} fitur bergeser. Metrik validasi mungkin tidak berlaku penuh; periksa apakah kohort hanya berisi sebagian modul atau ada perubahan cara data dicatat.`}
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fitur</TableHead>
              <TableHead className="text-right">PSI</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Kosong (train / kohort)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drift.features.map((f) => (
              <TableRow key={f.feature} className={f.status === "shift" ? "bg-destructive/5" : undefined}>
                <TableCell className="whitespace-normal">{f.label}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{fmtNum(f.psi, 3)}</TableCell>
                <TableCell><DriftBadge status={f.status} /></TableCell>
                <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">
                  {f.missing_reference != null && f.missing_reference + (f.missing_current ?? 0) > 0
                    ? `${fmtPct(f.missing_reference, 1)} / ${fmtPct(f.missing_current, 1)}`
                    : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Section>
  );
}

const DAYS = 7;

export async function RequestPanel() {
  const user = await getCurrentUser();
  if (user.role === "advisor") return null; // request statistics are for coordinators and admins
  const res = await getRequestStats(DAYS, user.accessToken);
  return (
    <Section title="Kesehatan API" description={`Semua panggilan ke API model dalam ${DAYS} hari terakhir, kecuali health check.`}>
      {!res.ok ? (
        <ApiError />
      ) : res.data.total === 0 ? (
        <EmptyState icon={Activity} title="Belum ada request tercatat" description="Setiap panggilan API menulis satu baris log." />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Request" value={fmtInt(res.data.total)} note={`${fmtInt(res.data.client_errors)} ditolak (4xx)`} />
            <KpiCard label="Error server (5xx)" value={fmtPct(res.data.error_rate, 1)} note={`${fmtInt(res.data.server_errors)} request`} />
            <KpiCard label="Latency p50" value={`${fmtInt(res.data.latency_ms?.p50)} ms`} note="Waktu proses di API" />
            <KpiCard label="Latency p95" value={`${fmtInt(res.data.latency_ms?.p95)} ms`} note="5% request paling lambat" />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Endpoint</TableHead>
                <TableHead className="text-right">Request</TableHead>
                <TableHead className="text-right">4xx</TableHead>
                <TableHead className="text-right">5xx</TableHead>
                <TableHead className="text-right">p50 (ms)</TableHead>
                <TableHead className="text-right">p95 (ms)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {res.data.endpoints.map((e) => (
                <TableRow key={e.endpoint}>
                  <TableCell className="font-mono text-xs">{e.endpoint}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{fmtInt(e.requests)}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{fmtInt(e.client_errors)}</TableCell>
                  <TableCell className={cn("text-right font-mono tabular-nums", e.server_errors > 0 && "font-semibold text-destructive")}>
                    {fmtInt(e.server_errors)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{fmtInt(e.p50)}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{fmtInt(e.p95)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Section>
  );
}
