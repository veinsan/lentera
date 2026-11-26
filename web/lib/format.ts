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

/** Probabilities in tables: two decimals (docs/DESIGN.md Typography). */
// Two decimals, but a calibrated probability never prints as certainty: 0.995 and above shows as "0,99+".
export const fmtProb = (value: number | null | undefined) => (value != null && value >= 0.995 ? "0,99+" : fmtNum(value, 2));

/** A probability as a one-decimal percent that never prints as a certain 100,0%. */
export const fmtProbPct = (value: number | null | undefined) => (value != null && value >= 0.9995 ? ">99,9%" : fmtPct(value, 1));

export function fmtModule(code: string): string {
  return code.toUpperCase();
}

/** Rupiah in words for scenario figures: Rp350.000, Rp7,5 juta, Rp1,2 miliar. */
export function fmtRp(value: number | null | undefined): string {
  if (value == null) return EMPTY;
  const abs = Math.abs(value);
  const [div, unit] = abs >= 1e9 ? [1e9, " miliar"] : abs >= 1e6 ? [1e6, " juta"] : [1, ""];
  const n = new Intl.NumberFormat("id-ID", { maximumFractionDigits: div === 1 ? 0 : 1 }).format(abs / div);
  return `${value < 0 ? "-" : ""}Rp${n}${unit}`;
}
