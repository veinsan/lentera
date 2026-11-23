import type { ReactNode } from "react";
import { TableBody, TableCell, TableColumn, TableContent, TableHeader, TableRoot, TableRow, TableScrollContainer } from "@heroui/react";
import { cn } from "@/lib/utils";

export type Column<T> = {
  id: string;
  label: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "end";
  rowHeader?: boolean;
  className?: string;
};

/**
 * HeroUI (React Aria) table from column definitions. Named parts, not Table.X, so server pages can render it
 * (a server component cannot dot into a client module). rowHref turns whole rows into router links.
 */
export function DataTable<T>({
  label,
  columns,
  rows,
  rowId,
  rowHref,
  className,
  dense = false,
}: {
  label: string;
  columns: Column<T>[];
  rows: T[];
  rowId: (row: T) => string | number;
  rowHref?: (row: T) => string;
  className?: string;
  dense?: boolean;
}) {
  const hasHeader = columns.some((c) => c.rowHeader);
  return (
    <TableRoot
      variant="secondary"
      className={cn("lentera-table", dense && "lentera-table--dense", rowHref && "lentera-table--links", className)}
    >
      <TableScrollContainer>
        <TableContent aria-label={label}>
          <TableHeader>
            {columns.map((c, i) => (
              <TableColumn
                key={c.id}
                id={c.id}
                isRowHeader={c.rowHeader ?? (!hasHeader && i === 0)}
                className={cn(c.align === "end" && "text-end", c.className)}
              >
                {c.label}
              </TableColumn>
            ))}
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={rowId(r)} id={rowId(r)} href={rowHref?.(r)}>
                {columns.map((c) => (
                  <TableCell key={c.id} className={cn(c.align === "end" && "text-end tabular-nums", c.className)}>
                    {c.cell(r)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </TableContent>
      </TableScrollContainer>
    </TableRoot>
  );
}
