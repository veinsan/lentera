"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS, ChartTooltip, type TooltipContentProps } from "@/components/charts/chart-tooltip";
import { fmtInt, fmtNum } from "@/lib/format";

type Bin = { predicted: number; observed: number; n: number };

export function CalibrationChart({ bins }: { bins: Bin[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={bins} margin={{ top: 8, right: 16, bottom: 16, left: 0 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis
          type="number"
          dataKey="predicted"
          domain={[0, 1]}
          ticks={[0, 0.25, 0.5, 0.75, 1]}
          tickFormatter={(v: number) => fmtNum(v, 2)}
          tick={AXIS}
          stroke="var(--border)"
          label={{ value: "Probabilitas prediksi", position: "insideBottom", offset: -12, ...AXIS }}
        />
        <YAxis
          type="number"
          domain={[0, 1]}
          ticks={[0, 0.25, 0.5, 0.75, 1]}
          tickFormatter={(v: number) => fmtNum(v, 2)}
          tick={AXIS}
          stroke="var(--border)"
          width={44}
        />
        <ReferenceLine
          segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]}
          stroke="var(--chart-3)"
          strokeWidth={1}
          label={{ value: "Kalibrasi sempurna", position: "insideTopLeft", ...AXIS }}
        />
        <Line
          dataKey="observed"
          stroke="var(--chart-2)"
          strokeWidth={2}
          isAnimationActive={false}
          dot={{ r: 4, fill: "var(--chart-2)", stroke: "var(--card)", strokeWidth: 2 }}
          activeDot={{ r: 6, stroke: "var(--card)", strokeWidth: 2 }}
        />
        <Tooltip
          cursor={{ stroke: "var(--border)" }}
          content={(p: TooltipContentProps) => {
            const b = p.payload?.[0]?.payload as Bin | undefined;
            if (!p.active || !b) return null;
            return (
              <ChartTooltip
                title={`Prediksi rata-rata ${fmtNum(b.predicted, 2)} (${fmtInt(b.n)} mahasiswa)`}
                rows={[{ name: "tingkat at-risk teramati", value: fmtNum(b.observed, 2), color: "var(--chart-2)" }]}
              />
            );
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
