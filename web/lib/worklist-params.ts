// Worklist filter values and URL handling. No server imports: the client filter bar uses this module too.
import type { Tier } from "@/lib/api";

export const TIER_VALUES: Tier[] = ["critical", "high", "watch", "low"];
export const ARCHETYPE_VALUES = ["silent", "no_lms_record", "missed_submission", "low_score", "fading", "engaged"];
export const STATUS_VALUES = ["belum", "sudah"] as const;

export type WorklistFilters = { module?: string; tier?: Tier; archetype?: string; status?: (typeof STATUS_VALUES)[number] };

type Params = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Parse and whitelist worklist filters from the URL; unknown values are dropped. */
export function parseWorklistParams(sp: Params): { filters: WorklistFilters; page: number } {
  const mod = one(sp.module);
  const tier = one(sp.tier);
  const archetype = one(sp.archetype);
  const status = one(sp.status);
  const page = Number.parseInt(one(sp.page) ?? "1", 10);
  return {
    filters: {
      module: mod && /^m0[1-9]$/.test(mod) ? mod : undefined,
      tier: TIER_VALUES.includes(tier as Tier) ? (tier as Tier) : undefined,
      archetype: archetype && ARCHETYPE_VALUES.includes(archetype) ? archetype : undefined,
      status: STATUS_VALUES.find((s) => s === status),
    },
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function toQuery(filters: WorklistFilters, page?: number): string {
  const q = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => v && q.set(k, v));
  if (page && page > 1) q.set("page", String(page));
  const s = q.toString();
  return s ? `?${s}` : "";
}
