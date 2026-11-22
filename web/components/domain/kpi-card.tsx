import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  note,
  highlight = false,
}: {
  label: string;
  value: string;
  note?: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn("rounded-lg border bg-card p-4", highlight && "border-l-4 border-l-brand-accent")}>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-[1.75rem] font-semibold leading-tight">{value}</p>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
