import { fmtInt, fmtModule } from "@/lib/format";

type Cell = { value: number; n: number };

/**
 * Sequential single-hue heatmap: the at-risk color mixed into the card surface, 10% to 70%.
 * Ink text stays above 4.6:1 up to the 70% mix; white never reaches 3.5:1, so text is always ink.
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
  const share = (v: number) => Math.round(10 + ((v - lo) / (hi - lo || 1)) * 60);
  return (
    <div>
      <table className="w-full table-fixed border-separate border-spacing-0.5 text-sm">
        <thead>
          <tr>
            <th className="w-24 text-left text-xs font-semibold text-muted-foreground">Modul</th>
            {cols.map((c) => (
              <th key={c} className="text-xs font-semibold text-muted-foreground">
                {fmtModule(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r}>
              <th scope="row" className="text-left text-sm font-medium">
                {fmtModule(r)}
              </th>
              {cols.map((c) => {
                const cell = cells[r]?.[c];
                if (!cell) return <td key={c} className="rounded-sm bg-background" aria-label="Tidak ada" />;
                return (
                  <td
                    key={c}
                    title={`${fmtModule(r)} ${fmtModule(c)}: ${label} ${format(cell.value)} dari ${fmtInt(cell.n)} mahasiswa`}
                    className="rounded-sm px-2 py-2 text-center font-mono text-foreground"
                    style={{ background: `color-mix(in oklch, var(--chart-1) ${share(cell.value)}%, var(--card))` }}
                  >
                    {format(cell.value)}
                    <span className="block text-[10px] opacity-80">n={fmtInt(cell.n)}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span>{format(lo)}</span>
        <span
          className="h-2 w-40 rounded-full"
          style={{
            background:
              "linear-gradient(to right, color-mix(in oklch, var(--chart-1) 10%, var(--card)), color-mix(in oklch, var(--chart-1) 70%, var(--card)))",
          }}
          aria-hidden
        />
        <span>{format(hi)}</span>
        <span className="ml-2">{label}</span>
      </div>
    </div>
  );
}
