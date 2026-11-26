import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DataTableClient } from "./data-table-client";

export type Column<T> = {
  id: string;
  label: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "end";
  rowHeader?: boolean;
  className?: string;
};

/**
 * HeroUI (React Aria) table from column definitions. Cells are computed here, so server pages can pass cell
 * functions; the table is built in DataTableClient. rowHref turns whole rows into router links.
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
  return (
    <DataTableClient
      label={label}
      columns={columns.map(({ id, label, align, rowHeader, className }) => ({ id, label, align, rowHeader, className }))}
      rows={rows.map((r) => ({ id: rowId(r), href: rowHref?.(r), cells: columns.map((c) => <Fragment key={c.id}>{c.cell(r)}</Fragment>) }))}
      links={!!rowHref}
      className={cn(dense && "lentera-table--dense", className)}
    />
  );
}
