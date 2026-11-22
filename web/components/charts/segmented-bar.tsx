import { cn } from "@/lib/utils";
import { fmtInt, fmtPct } from "@/lib/format";

export type Segment = { key: string; label: string; value: number; className: string; textClassName: string };

/** Tall segmented bar (dataviz Figures): one whole split into parts, share printed inside when it fits. */
export function SegmentedBar({ segments, ariaLabel }: { segments: Segment[]; ariaLabel: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div>
      <div role="img" aria-label={ariaLabel} className="flex h-7 w-full gap-0.5">
        {segments
          .filter((s) => s.value > 0)
          .map((s) => {
            const share = s.value / total;
            return (
              <div
                key={s.key}
                title={`${s.label}: ${fmtInt(s.value)} (${fmtPct(share, 1)})`}
                className={cn("flex items-center rounded-[4px] px-2 text-xs font-semibold", s.className, s.textClassName)}
                style={{ width: `${share * 100}%` }}
              >
                {share >= 0.08 && fmtPct(share)}
              </div>
            );
          })}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className={cn("inline-block size-2.5 rounded-sm", s.className)} aria-hidden />
            {s.label}
            <span className="font-mono text-muted-foreground">{fmtInt(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
