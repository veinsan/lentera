"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS, ChartTooltip, type TooltipContentProps } from "@/components/charts/chart-tooltip";
import { fmtInt, fmtNum } from "@/lib/format";

type Bin = { predicted: number; observed: number; n: number };

export function CalibrationChart({ bins }: { bins: Bin[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={bins} margin={{ top: 8, right: 16, bottom: 16, left: 0 }}>
        <CartesianGrid stroke="var(--line)" vertical={false} />
        <XAxis
          type="number"
          dataKey="predicted"
          domain={[0, 1]}
          ticks={[0, 0.25, 0.5, 0.75, 1]}
          tickFormatter={(v: number) => fmtNum(v, 2)}
          tick={AXIS}
          stroke="var(--line)"
          label={{ value: "Probabilitas prediksi", position: "insideBottom", offset: -12, ...AXIS }}
        />
        <YAxis
          type="number"
          domain={[0, 1]}
          ticks={[0, 0.25, 0.5, 0.75, 1]}
          tickFormatter={(v: number) => fmtNum(v, 2)}
          tick={AXIS}
          stroke="var(--line)"
          width={44}
        />
        <ReferenceLine
          segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]}
          stroke="var(--chart-neutral)"
          strokeWidth={1}
          label={{ value: "Kalibrasi sempurna", position: "insideTopLeft", ...AXIS }}
        />
        <Line
          dataKey="observed"
          stroke="var(--chart-safe)"
          strokeWidth={2}
          isAnimationActive={false}
          dot={{ r: 4, fill: "var(--chart-safe)", stroke: "var(--surface)", strokeWidth: 2 }}
          activeDot={{ r: 6, stroke: "var(--surface)", strokeWidth: 2 }}
        />
        <Tooltip
          cursor={{ stroke: "var(--line)" }}
          content={(p: TooltipContentProps) => {
            const b = p.payload?.[0]?.payload as Bin | undefined;
            if (!p.active || !b) return null;
            return (
              <ChartTooltip
                title={`Prediksi rata-rata ${fmtNum(b.predicted, 2)} (${fmtInt(b.n)} mahasiswa)`}
                rows={[{ name: "tingkat at-risk teramati", value: fmtNum(b.observed, 2), color: "var(--chart-safe)" }]}
              />
            );
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
