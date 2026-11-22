"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS, ChartTooltip, type TooltipContentProps } from "@/components/charts/chart-tooltip";
import { fmtInt } from "@/lib/format";

// The student carries the emphasis color; the two module medians are reference series.
const SERIES = [
  { key: "student", name: "Mahasiswa ini", color: "var(--chart-2)", width: 2.5 },
  { key: "at_risk", name: "Median at-risk", color: "var(--chart-1)", width: 1.5 },
  { key: "not_at_risk", name: "Median tidak at-risk", color: "var(--chart-3)", width: 1.5 },
] as const;

export function StudentWeeklyChart({
  student,
  atRisk,
  notAtRisk,
}: {
  student: number[];
  atRisk: number[];
  notAtRisk: number[];
}) {
  const data = [0, 1, 2, 3].map((i) => ({ week: `M${i + 1}`, student: student[i], at_risk: atRisk[i], not_at_risk: notAtRisk[i] }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis dataKey="week" tick={AXIS} stroke="var(--border)" />
        <YAxis tick={AXIS} stroke="var(--border)" width={40} />
        {SERIES.map((s) => (
          <Line
            key={s.key}
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={s.width}
            dot={{ r: 4, fill: s.color, stroke: "var(--card)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        ))}
        <Legend verticalAlign="top" align="right" iconType="plainline" wrapperStyle={{ fontSize: 12, color: "var(--foreground)" }} />
        <Tooltip
          cursor={{ stroke: "var(--border)" }}
          content={(p: TooltipContentProps) => {
            const d = p.payload?.[0]?.payload as (typeof data)[number] | undefined;
            if (!p.active || !d) return null;
            return (
              <ChartTooltip
                title={`Interaksi minggu ${d.week.slice(1)}`}
                rows={SERIES.map((s) => ({ name: s.name, value: fmtInt(d[s.key]), color: s.color }))}
              />
            );
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
