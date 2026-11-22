// One place for number formatting so every page shows values the same way (id-ID: comma decimals).
const EMPTY = "-";

export function fmtNum(value: number | null | undefined, digits = 4): string {
  if (value == null) return EMPTY;
  return new Intl.NumberFormat("id-ID", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

export function fmtPct(value: number | null | undefined, digits = 0): string {
  if (value == null) return EMPTY;
  return new Intl.NumberFormat("id-ID", {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function fmtInt(value: number | null | undefined): string {
  return value == null ? EMPTY : new Intl.NumberFormat("id-ID").format(Math.round(value));
}

/** Probabilities in tables: two decimals (DESIGN.md Typography). */
export const fmtProb = (value: number | null | undefined) => fmtNum(value, 2);

export function fmtModule(code: string): string {
  return code.toUpperCase();
}
