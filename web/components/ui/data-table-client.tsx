"use client";

import type { ReactNode } from "react";
import { TableBody, TableCell, TableColumn, TableContent, TableHeader, TableRoot, TableRow, TableScrollContainer } from "@heroui/react";
import { cn } from "@/lib/utils";

export type ColumnMeta = { id: string; label: ReactNode; align?: "end"; rowHeader?: boolean; className?: string };
export type RowData = { id: string | number; href?: string; cells: ReactNode[] };

/**
 * The React Aria table itself. Rows and cells are created here, on the client side of the boundary: row elements
 * streamed from a server component arrive as lazy chunks, and React Aria renders its collection inside a <template>,
 * where React's streaming script cannot find the placeholders and hydration fails.
 */
export function DataTableClient({
  label,
  columns,
  rows,
  links,
  className,
}: {
  label: string;
  columns: ColumnMeta[];
  rows: RowData[];
  links: boolean;
  className?: string;
}) {
  const hasHeader = columns.some((c) => c.rowHeader);
  return (
    <TableRoot variant="secondary" className={cn("lentera-table", links && "lentera-table--links", className)}>
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
              <TableRow key={r.id} id={r.id} href={r.href}>
                {columns.map((c, i) => (
                  <TableCell key={c.id} className={cn(c.align === "end" && "text-end tabular-nums", c.className)}>
                    {r.cells[i]}
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
