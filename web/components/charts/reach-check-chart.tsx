"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS, ChartTooltip, type TooltipContentProps } from "@/components/charts/chart-tooltip";
import { fmtInt, fmtPct } from "@/lib/format";

type Point = { share: number; n: number; expected_at_risk: number; at_risk: number };

// The real outcome carries the story; the model's expectation is the neutral reference it is checked against.
const SERIES = [
  { key: "at_risk", name: "Benar-benar berisiko", color: "var(--chart-safe)" },
  { key: "expected_at_risk", name: "Perkiraan dari probabilitas", color: "var(--chart-neutral)" },
] as const;

/** Students reached when contacting the top share by probability: the summed probabilities against the real count. */
export function ReachCheckChart({ points }: { points: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={points} margin={{ top: 8, right: 16, bottom: 16, left: 8 }}>
        <CartesianGrid stroke="var(--line)" vertical={false} />
        <XAxis
          type="number"
          dataKey="share"
          domain={[0, 1]}
          ticks={[0, 0.2, 0.4, 0.6, 0.8, 1]}
          tickFormatter={(v: number) => fmtPct(v)}
          tick={AXIS}
          stroke="var(--line)"
          label={{ value: "Mahasiswa yang dihubungi, urut probabilitas", position: "insideBottom", offset: -12, ...AXIS }}
        />
        <YAxis tickFormatter={(v: number) => fmtInt(v)} tick={AXIS} stroke="var(--line)" width={52} />
        {SERIES.map((s) => (
          <Line
            key={s.key}
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        ))}
        <Legend verticalAlign="top" align="right" iconType="plainline" wrapperStyle={{ fontSize: 12, color: "var(--ink)", paddingBottom: 8 }} />
        <Tooltip
          cursor={{ stroke: "var(--line)" }}
          content={(p: TooltipContentProps) => {
            const d = p.payload?.[0]?.payload as Point | undefined;
            if (!p.active || !d) return null;
            return (
              <ChartTooltip
                title={`Top ${fmtPct(d.share)} (${fmtInt(d.n)} mahasiswa)`}
                rows={SERIES.map((s) => ({ name: s.name, value: fmtInt(d[s.key]), color: s.color }))}
              />
            );
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
