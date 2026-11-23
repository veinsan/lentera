import { fmtInt, fmtModule } from "@/lib/format";

type Cell = { value: number; n: number };

/**
 * Sequential single-hue heatmap: the at-risk colour mixed into white, 8% to 62%.
 * Ink text holds above 4.5:1 across that range, so cell text is always ink.
 */
export function HeatmapTable({
  rows,
  cols,
  cells,
  format,
  label,
}: {
  rows: string[];
  cols: string[];
  cells: Record<string, Record<string, Cell>>;
  format: (v: number) => string;
  label: string;
}) {
  const values = rows.flatMap((r) => cols.map((c) => cells[r]?.[c]?.value)).filter((v): v is number => v != null);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const share = (v: number) => Math.round(8 + ((v - lo) / (hi - lo || 1)) * 54);
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] table-fixed border-separate border-spacing-1 text-sm">
          <thead>
            <tr>
              <th className="w-20 text-left text-xs font-medium text-ink-3">Modul</th>
              {cols.map((c) => (
                <th key={c} className="text-xs font-medium text-ink-3">
                  {fmtModule(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r}>
                <th scope="row" className="text-left text-sm font-semibold text-ink">
                  {fmtModule(r)}
                </th>
                {cols.map((c) => {
                  const cell = cells[r]?.[c];
                  if (!cell) return <td key={c} className="rounded-xl bg-surface-secondary" aria-label="Tidak ada" />;
                  return (
                    <td
                      key={c}
                      title={`${fmtModule(r)} ${fmtModule(c)}: ${label} ${format(cell.value)} dari ${fmtInt(cell.n)} mahasiswa`}
                      className="rounded-xl px-2 py-2.5 text-center font-semibold text-ink tabular-nums"
                      style={{ background: `color-mix(in oklch, var(--chart-risk) ${share(cell.value)}%, white)` }}
                    >
                      {format(cell.value)}
                      <span className="block text-[11px] font-normal text-ink-2">n={fmtInt(cell.n)}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-ink-3">
        <span className="tabular-nums">{format(lo)}</span>
        <span
          className="h-2 w-40 rounded-full"
          style={{
            background: "linear-gradient(to right, color-mix(in oklch, var(--chart-risk) 8%, white), color-mix(in oklch, var(--chart-risk) 62%, white))",
          }}
          aria-hidden
        />
        <span className="tabular-nums">{format(hi)}</span>
        <span className="ml-2">{label}</span>
      </div>
    </div>
  );
}
