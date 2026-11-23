"use client";

import { CartesianGrid, Legend, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS, ChartTooltip, type TooltipContentProps } from "@/components/charts/chart-tooltip";
import { fmtNum } from "@/lib/format";

type Row = { label: string; f1_seed42: number; f1_seed137: number };

const SEEDS = [
  { key: "f1_seed42", name: "Seed 42", color: "var(--chart-safe)" },
  { key: "f1_seed137", name: "Seed 137", color: "var(--chart-neutral)" },
] as const;

/** Dot plot: the values differ in the third decimal, so dots on a narrow axis instead of bars from zero. */
export function AblationChart({ rows }: { rows: Row[] }) {
  const values = rows.flatMap((r) => [r.f1_seed42, r.f1_seed137]);
  const lo = Math.floor(Math.min(...values) * 1000 - 1) / 1000;
  const hi = Math.ceil(Math.max(...values) * 1000 + 1) / 1000;
  return (
    <ResponsiveContainer width="100%" height={rows.length * 44 + 60}>
      <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid stroke="var(--line)" horizontal={false} />
        <XAxis
          type="number"
          dataKey="x"
          domain={[lo, hi]}
          tickFormatter={(v: number) => fmtNum(v, 3)}
          tick={AXIS}
          stroke="var(--line)"
          tickCount={6}
        />
        <YAxis
          type="category"
          dataKey="label"
          allowDuplicatedCategory={false}
          reversed
          width={190}
          tick={{ ...AXIS, fill: "var(--ink)" }}
          axisLine={false}
          tickLine={false}
        />
        {SEEDS.map((s) => (
          <Scatter
            key={s.key}
            name={s.name}
            data={rows.map((r) => ({ label: r.label, x: r[s.key] }))}
            fill={s.color}
            stroke="var(--surface)"
            strokeWidth={2}
            isAnimationActive={false}
          />
        ))}
        <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: 12, color: "var(--ink)" }} />
        <Tooltip
          cursor={false}
          content={(p: TooltipContentProps) => {
            const d = p.payload?.[0]?.payload as { label: string } | undefined;
            const row = d && rows.find((r) => r.label === d.label);
            if (!p.active || !row) return null;
            return (
              <ChartTooltip
                title={row.label}
                rows={SEEDS.map((s) => ({ name: `F1 ${s.name}`, value: fmtNum(row[s.key], 4), color: s.color }))}
              />
            );
          }}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
