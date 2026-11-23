"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS, ChartTooltip, type TooltipContentProps } from "@/components/charts/chart-tooltip";
import { fmtNum, fmtPct } from "@/lib/format";

type Bin = { lower: number; upper: number; reference: number; current: number };

const SERIES = [
  { key: "reference", name: "Train (OOF)", color: "var(--chart-neutral)" },
  { key: "current", name: "Kohort ini", color: "var(--chart-safe)" },
] as const;

/** Share of students per predicted-probability bin: training reference beside the current cohort. */
export function DriftChart({ bins }: { bins: Bin[] }) {
  const data = bins.map((b) => ({ ...b, bin: `${fmtNum(b.lower, 1)}-${fmtNum(b.upper, 1)}` }));
  // Ticks every 5 percentage points up to the tallest bar.
  const top = Math.ceil(Math.max(...bins.flatMap((b) => [b.reference, b.current])) * 20) / 20;
  const ticks = Array.from({ length: Math.round(top * 20) + 1 }, (_, i) => i / 20);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 16, left: 0 }} barGap={2} barCategoryGap="20%">
        <CartesianGrid stroke="var(--line)" vertical={false} />
        <XAxis
          dataKey="bin"
          tick={AXIS}
          stroke="var(--line)"
          interval={0}
          label={{ value: "Probabilitas prediksi", position: "insideBottom", offset: -12, ...AXIS }}
        />
        <YAxis domain={[0, top]} ticks={ticks} tickFormatter={(v: number) => fmtPct(v)} tick={AXIS} stroke="var(--line)" width={44} />
        <Legend
          verticalAlign="top"
          align="right"
          iconType="circle"
          itemSorter={(item) => SERIES.findIndex((s) => s.key === item.dataKey)} // bar order, not alphabetical
          wrapperStyle={{ fontSize: 12, color: "var(--ink)" }}
        />
        {SERIES.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        ))}
        <Tooltip
          cursor={{ fill: "var(--surface-tertiary)" }}
          content={(p: TooltipContentProps) => {
            const b = p.payload?.[0]?.payload as (Bin & { bin: string }) | undefined;
            if (!p.active || !b) return null;
            return (
              <ChartTooltip
                title={`Probabilitas ${b.bin}`}
                rows={SERIES.map((s) => ({ name: s.name, value: fmtPct(b[s.key], 1), color: s.color }))}
              />
            );
          }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
