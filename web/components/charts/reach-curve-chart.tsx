"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS, ChartTooltip, type TooltipContentProps } from "@/components/charts/chart-tooltip";
import { fmtInt } from "@/lib/format";

type Point = { hours: number; advisor_contacts: number; expected_at_risk_reached: number };

/** Single series: expected at-risk students reached by advisors over total advisor hours per week. */
export function ReachCurveChart({ curve, currentHours }: { curve: Point[]; currentHours: number }) {
  const maxHours = curve.at(-1)?.hours ?? 0;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={curve} margin={{ top: 16, right: 24, bottom: 16, left: 0 }}>
        <CartesianGrid stroke="var(--line)" vertical={false} />
        <XAxis
          type="number"
          dataKey="hours"
          domain={[0, maxHours]}
          tickFormatter={(v: number) => fmtInt(v)}
          tick={AXIS}
          stroke="var(--line)"
          label={{ value: "Total jam konselor per minggu", position: "insideBottom", offset: -12, ...AXIS }}
        />
        <YAxis tickFormatter={(v: number) => fmtInt(v)} tick={AXIS} stroke="var(--line)" width={48} />
        {currentHours > 0 && currentHours <= maxHours && (
          <ReferenceLine
            x={currentHours}
            stroke="var(--blue)"
            strokeWidth={2}
            label={{ value: "Kapasitas saat ini", position: "insideTopLeft", offset: 8, ...AXIS, fill: "var(--ink)" }}
          />
        )}
        <Line
          dataKey="expected_at_risk_reached"
          stroke="var(--chart-safe)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }}
          isAnimationActive={false}
        />
        <Tooltip
          cursor={{ stroke: "var(--line)" }}
          content={(p: TooltipContentProps) => {
            const d = p.payload?.[0]?.payload as Point | undefined;
            if (!p.active || !d) return null;
            return (
              <ChartTooltip
                title={`${fmtInt(d.hours)} jam konselor per minggu, ${fmtInt(d.advisor_contacts)} mahasiswa dihubungi`}
                rows={[{ name: "perkiraan mahasiswa berisiko terjangkau", value: fmtInt(d.expected_at_risk_reached), color: "var(--chart-safe)" }]}
              />
            );
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
