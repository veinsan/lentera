import type { Reason } from "@/lib/data";
import { fmtNum } from "@/lib/format";

/**
 * SHAP reasons: a sentence plus a bar on one shared scale (maxAbs) across both lists.
 * Raises risk in the at-risk colour, lowers it in the not-at-risk colour; the sign is also printed.
 */
export function ReasonList({ title, items, maxAbs, note }: { title: string; items: Reason[]; maxAbs: number; note?: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {note && <p className="mt-0.5 text-xs leading-relaxed text-ink-3">{note}</p>}
      <ul className="mt-3 flex flex-col gap-3">
        {items.map((r) => {
          const raises = r.shap > 0;
          return (
            <li key={r.signal} className="grid grid-cols-[1fr_7.5rem] items-center gap-4 text-sm">
              <div className="min-w-0">
                <p className="text-xs text-ink-3">{r.label}</p>
                <p className="leading-snug text-ink">{r.text}</p>
              </div>
              <div className="flex items-center gap-2" title={`Kontribusi log-odds ${fmtNum(r.shap, 3)}`}>
                <span className="h-2 flex-1 rounded-full bg-surface-tertiary">
                  <span
                    className="block h-2 rounded-full"
                    style={{
                      width: `${Math.max(5, (Math.abs(r.shap) / (maxAbs || 1)) * 100)}%`,
                      background: raises ? "var(--chart-risk)" : "var(--chart-safe)",
                    }}
                  />
                </span>
                <span className="w-11 text-right text-xs font-semibold text-ink-2 tabular-nums">
                  {raises ? "+" : ""}
                  {fmtNum(r.shap, 2)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
