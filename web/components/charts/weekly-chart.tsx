"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS, ChartTooltip, type TooltipContentProps } from "@/components/charts/chart-tooltip";
import { fmtInt } from "@/lib/format";

const SERIES = [
  { key: "at_risk", name: "At-risk", color: "var(--chart-1)" },
  { key: "not_at_risk", name: "Tidak at-risk", color: "var(--chart-2)" },
] as const;

type Weekly = { at_risk: number[]; not_at_risk: number[] };

/** Small multiple: median weekly interactions by outcome. yMax is shared across modules so panels compare. */
export function WeeklyChart({ weekly, yMax }: { weekly: Weekly; yMax: number }) {
  const data = [0, 1, 2, 3].map((i) => ({
    week: `M${i + 1}`,
    at_risk: weekly.at_risk[i],
    not_at_risk: weekly.not_at_risk[i],
  }));
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis dataKey="week" tick={AXIS} stroke="var(--border)" />
        <YAxis domain={[0, yMax]} tick={AXIS} stroke="var(--border)" width={36} />
        {SERIES.map((s) => (
          <Line
            key={s.key}
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
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
                title={`Median interaksi minggu ${d.week.slice(1)}`}
                rows={SERIES.map((s) => ({ name: s.name, value: fmtInt(d[s.key]), color: s.color }))}
              />
            );
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
