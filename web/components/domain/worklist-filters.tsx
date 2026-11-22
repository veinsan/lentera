"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { TIER_LABELS } from "@/components/domain/tier-badge";
import { buttonVariants } from "@/components/ui/button";
import type { Tier } from "@/lib/api";
import { fmtModule } from "@/lib/format";
import { ARCHETYPE_LABELS } from "@/lib/labels";
import { toQuery, type WorklistFilters } from "@/lib/worklist-params";

const TIERS: Tier[] = ["critical", "high", "watch"]; // flagged students are never in the low tier
const ARCHETYPES = ["silent", "no_lms_record", "missed_submission", "low_score", "fading", "engaged"];

export function WorklistFiltersBar({ filters, modules }: { filters: WorklistFilters; modules: string[] }) {
  const router = useRouter();
  const set = (key: keyof WorklistFilters, value: string) => router.push(`/prioritas${toQuery({ ...filters, [key]: value || undefined })}`);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Select label="Modul" value={filters.module} onChange={(v) => set("module", v)}
        options={modules.map((m) => [m, fmtModule(m)])} />
      <Select label="Tier" value={filters.tier} onChange={(v) => set("tier", v)}
        options={TIERS.map((t) => [t, TIER_LABELS[t]])} />
      <Select label="Archetype" value={filters.archetype} onChange={(v) => set("archetype", v)}
        options={ARCHETYPES.map((a) => [a, ARCHETYPE_LABELS[a]])} />
      <Select label="Status" value={filters.status} onChange={(v) => set("status", v)}
        options={[["belum", "Belum dihubungi"], ["sudah", "Sudah ada catatan"]]} />
      {Object.values(filters).some(Boolean) && (
        <Link href="/prioritas" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Reset filter
        </Link>
      )}
      <a href={`/prioritas/export${toQuery(filters)}`} className={buttonVariants({ variant: "outline", className: "ml-auto" })}>
        <Download aria-hidden />
        Ekspor CSV
      </a>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
      {label}
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 min-w-36 rounded-md border bg-card px-2 text-sm font-normal text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        <option value="">Semua</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
