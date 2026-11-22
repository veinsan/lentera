"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS, ChartTooltip, type TooltipContentProps } from "@/components/charts/chart-tooltip";
import { fmtInt, fmtPct } from "@/lib/format";

type Point = { share: number; n: number; precision: number; recall: number };

// Precision carries the story (emphasis color); recall is the neutral companion series.
const SERIES = [
  { key: "precision", name: "Presisi", color: "var(--chart-2)" },
  { key: "recall", name: "Recall", color: "var(--chart-3)" },
] as const;

export function CapacityChart({ points }: { points: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={points} margin={{ top: 8, right: 16, bottom: 16, left: 0 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis
          type="number"
          dataKey="share"
          domain={[0, 1]}
          ticks={[0, 0.2, 0.4, 0.6, 0.8, 1]}
          tickFormatter={(v: number) => fmtPct(v)}
          tick={AXIS}
          stroke="var(--border)"
          label={{ value: "Mahasiswa yang dihubungi, urut probabilitas", position: "insideBottom", offset: -12, ...AXIS }}
        />
        <YAxis
          domain={[0, 1]}
          ticks={[0, 0.25, 0.5, 0.75, 1]}
          tickFormatter={(v: number) => fmtPct(v)}
          tick={AXIS}
          stroke="var(--border)"
          width={44}
        />
        {SERIES.map((s) => (
          <Line
            key={s.key}
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        ))}
        <Legend
          verticalAlign="top"
          align="right"
          iconType="plainline"
          wrapperStyle={{ fontSize: 12, color: "var(--foreground)", paddingBottom: 8 }}
        />
        <Tooltip
          cursor={{ stroke: "var(--border)" }}
          content={(p: TooltipContentProps) => {
            const d = p.payload?.[0]?.payload as Point | undefined;
            if (!p.active || !d) return null;
            return (
              <ChartTooltip
                title={`Top ${fmtPct(d.share)} (${fmtInt(d.n)} mahasiswa)`}
                rows={SERIES.map((s) => ({ name: s.name, value: fmtPct(d[s.key], 1), color: s.color }))}
              />
            );
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
