import Link from "next/link";
import { cn } from "@/lib/utils";
import { fmtInt, fmtPct } from "@/lib/format";

export type Segment = { key: string; label: string; value: number; className: string; textClassName: string; href?: string };

/** One whole split into parts, share printed inside when it fits; a segment with href opens its filtered list. */
export function SegmentedBar({ segments, ariaLabel }: { segments: Segment[]; ariaLabel: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div>
      <div aria-label={ariaLabel} role="group" className="flex h-10 w-full gap-1">
        {segments
          .filter((s) => s.value > 0)
          .map((s) => {
            const share = s.value / total;
            const body = share >= 0.07 ? fmtPct(share) : "";
            const cls = cn(
              "flex items-center rounded-[10px] px-3 text-[13px] font-semibold transition-[filter,transform] duration-200",
              s.className,
              s.textClassName,
              s.href && "hover:brightness-110 hover:-translate-y-px",
            );
            const label = `${s.label}: ${fmtInt(s.value)} (${fmtPct(share, 1)})`;
            return s.href ? (
              <Link key={s.key} href={s.href} title={label} aria-label={`${label}, buka daftar`} className={cls} style={{ width: `${share * 100}%` }}>
                {body}
              </Link>
            ) : (
              <div key={s.key} title={label} className={cls} style={{ width: `${share * 100}%` }}>
                {body}
              </div>
            );
          })}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-ink-2">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className={cn("inline-block size-2.5 rounded-full", s.className)} aria-hidden />
            {s.label}
            <span className="font-semibold text-ink tabular-nums">{fmtInt(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
