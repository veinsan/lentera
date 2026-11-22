import { CircleAlert, CircleCheck, Info, TriangleAlert, Wrench } from "lucide-react";
import type { QualityCheck, QualityReport } from "@/lib/api";
import { fmtInt, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS = {
  ok: { label: "Lolos pemeriksaan", icon: CircleCheck, className: "border-success/40 bg-success/10 text-success" },
  warning: { label: "Lolos dengan catatan", icon: TriangleAlert, className: "border-risk-watch/50 bg-risk-watch/10 text-risk-high" },
  error: { label: "Tidak bisa dinilai", icon: CircleAlert, className: "border-destructive/40 bg-destructive/10 text-destructive" },
} as const;

const LEVEL = {
  error: { label: "Error", icon: CircleAlert, className: "text-destructive" },
  warning: { label: "Peringatan", icon: TriangleAlert, className: "text-risk-high" },
  info: { label: "Info", icon: Info, className: "text-muted-foreground" },
} as const;

function details(d: QualityCheck["details"]): string | null {
  if (!d) return null;
  if (Array.isArray(d)) return d.join(", ");
  return Object.entries(d)
    .map(([k, v]) => (typeof v === "object" && v ? `${k}: ${Object.entries(v).map(([a, b]) => `${a} (${b})`).join(", ")}` : `${k} (${v})`))
    .join("; ");
}

export function QualityReportView({ report }: { report: QualityReport }) {
  const status = STATUS[report.status];
  const shares = report.shares;
  return (
    <div className="flex flex-col gap-4">
      <div className={cn("flex items-center gap-3 rounded-md border px-4 py-3", status.className)}>
        <status.icon className="size-5 shrink-0" aria-hidden />
        <p className="text-sm font-semibold">
          {status.label} · {fmtInt(report.rows)} baris
        </p>
      </div>

      <ul className="flex flex-col divide-y rounded-md border">
        {report.checks.map((c) => {
          const level = LEVEL[c.level];
          const extra = details(c.details);
          return (
            <li key={c.code} className="flex gap-3 px-4 py-3 text-sm">
              <level.icon className={cn("mt-0.5 size-4 shrink-0", level.className)} aria-hidden />
              <div className="min-w-0">
                <p>
                  <span className={cn("mr-2 text-xs font-semibold", level.className)}>{level.label}</span>
                  {c.message}
                  {c.count != null && <span className="ml-1 font-mono text-muted-foreground">({fmtInt(c.count)})</span>}
                </p>
                {extra && <p className="mt-1 break-words text-xs text-muted-foreground">{extra}</p>}
              </div>
            </li>
          );
        })}
        {report.repairs.map((r) => (
          <li key={r.code} className="flex gap-3 px-4 py-3 text-sm">
            <Wrench className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <p>
              <span className="mr-2 text-xs font-semibold text-primary">Perbaikan otomatis</span>
              {r.message}
              <span className="ml-1 font-mono text-muted-foreground">({fmtInt(r.count)})</span>
            </p>
          </li>
        ))}
      </ul>

      {shares && (
        <dl className="grid grid-cols-3 gap-4 text-sm">
          <Share label="Tanpa catatan LMS valid" value={shares.placeholder_activity} train={shares.placeholder_activity_train} />
          <Share label="Belum ada nilai" value={shares.no_graded_score} train={shares.no_graded_score_train} />
          <Share label="Ada tugas jatuh tempo belum dikumpulkan" value={shares.no_submission} train={shares.no_submission_train} />
        </dl>
      )}
    </div>
  );
}

function Share({ label, value, train }: { label: string; value: number; train: number }) {
  return (
    <div className="rounded-md bg-muted p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-mono text-lg font-semibold">{fmtPct(value, 1)}</dd>
      <dd className="text-xs text-muted-foreground">Data train: {fmtPct(train, 1)}</dd>
    </div>
  );
}
