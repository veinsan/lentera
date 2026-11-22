"use client";

import type { TooltipContentProps } from "recharts";

type Row = { name: string; value: string; color: string };

/** Value first, series name second, keyed by a short line in the series color (dataviz interaction rules). */
export function ChartTooltip({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-overlay">
      <p className="mb-1 text-muted-foreground">{title}</p>
      {rows.map((r) => (
        <p key={r.name} className="flex items-center gap-2">
          <span className="inline-block h-0.5 w-3" style={{ background: r.color }} aria-hidden />
          <span className="font-mono font-semibold text-foreground">{r.value}</span>
          <span className="text-muted-foreground">{r.name}</span>
        </p>
      ))}
    </div>
  );
}

export type { TooltipContentProps };
export const AXIS = { fontSize: 12, fill: "var(--muted-foreground)" } as const;
