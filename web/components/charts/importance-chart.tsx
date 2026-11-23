"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS, ChartTooltip, type TooltipContentProps } from "@/components/charts/chart-tooltip";
import { fmtNum } from "@/lib/format";

type Item = { label: string; group: "actionable" | "context"; value: number };

const COLORS = { actionable: "var(--chart-safe)", context: "var(--chart-neutral)" } as const;
const NAMES = { actionable: "Bisa ditindaklanjuti", context: "Konteks" } as const;

export function ImportanceChart({ items }: { items: Item[] }) {
  const data = [...items].sort((a, b) => b.value - a.value);
  return (
    <div>
      <div className="mb-2 flex justify-end gap-4 text-xs">
        {(["actionable", "context"] as const).map((g) => (
          <span key={g} className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-sm" style={{ background: COLORS[g] }} aria-hidden />
            {NAMES[g]}
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={data.length * 26 + 16}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 48, bottom: 0, left: 0 }} barCategoryGap={6}>
          <CartesianGrid stroke="var(--line)" horizontal={false} />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            width={150}
            tick={{ ...AXIS, fill: "var(--ink)" }}
            axisLine={false}
            tickLine={false}
          />
          <Bar dataKey="value" barSize={16} radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.label} fill={COLORS[d.group]} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              formatter={(v: unknown) => `${fmtNum(Number(v), 1)}%`}
              style={{ fontSize: 12, fill: "var(--ink-3)" }}
            />
          </Bar>
          <Tooltip
            cursor={{ fill: "var(--surface-tertiary)" }}
            content={(p: TooltipContentProps) => {
              const d = p.payload?.[0]?.payload as Item | undefined;
              if (!p.active || !d) return null;
              return (
                <ChartTooltip
                  title={d.label}
                  rows={[{ name: NAMES[d.group], value: `${fmtNum(d.value, 1)}%`, color: COLORS[d.group] }]}
                />
              );
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
