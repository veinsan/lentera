import { cn } from "@/lib/utils";

/** A fact on paper: label, a condensed numeral, a note. `highlight` marks the number with the lime stroke. */
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
    <div className="sheet px-5 py-4">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-2 text-[2rem] display-numeral">
        <span className={cn(highlight && "marker")}>{value}</span>
      </p>
      {note && <p className="mt-1.5 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
