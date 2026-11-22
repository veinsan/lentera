import type { Reason } from "@/lib/data";
import { fmtNum } from "@/lib/format";

/**
 * SHAP reason list (DESIGN.md Components): a sentence plus a small bar, at-risk color when the signal raises risk
 * and not-at-risk color when it lowers it. Bars share one scale (maxAbs) across both lists.
 */
export function ReasonList({ title, items, maxAbs, note }: { title: string; items: Reason[]; maxAbs: number; note?: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {note && <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>}
      <ul className="mt-2 flex flex-col gap-2">
        {items.map((r) => {
          const raises = r.shap > 0;
          return (
            <li key={r.signal} className="grid grid-cols-[1fr_7rem] items-center gap-3 text-sm">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{r.label}</p>
                <p>{r.text}</p>
              </div>
              <div className="flex items-center gap-1.5" title={`Kontribusi log-odds ${fmtNum(r.shap, 3)}`}>
                <span className="h-2 flex-1 rounded-full bg-muted">
                  <span
                    className="block h-2 rounded-full"
                    style={{
                      width: `${Math.max(4, (Math.abs(r.shap) / (maxAbs || 1)) * 100)}%`,
                      background: raises ? "var(--chart-1)" : "var(--chart-2)",
                    }}
                  />
                </span>
                <span className="w-9 text-right font-mono text-[11px] text-muted-foreground">
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
