"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Label, ListBox, Select, Spinner } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import { Download, RotateCcw } from "lucide-react";
import { TIER_LABELS } from "@/components/domain/tier-badge";
import type { Tier } from "@/lib/api";
import { fmtModule } from "@/lib/format";
import { ARCHETYPE_LABELS } from "@/lib/labels";
import { toQuery, type WorklistFilters } from "@/lib/worklist-params";

const TIERS: Tier[] = ["critical", "high", "watch"]; // flagged students are never in the low tier
const ARCHETYPES = ["silent", "no_lms_record", "missed_submission", "low_score", "fading", "engaged"];
const ALL = "semua";

export function WorklistFiltersBar({ filters, modules }: { filters: WorklistFilters; modules: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const set = (key: keyof WorklistFilters, value: string) =>
    start(() => router.push(`/prioritas${toQuery({ ...filters, [key]: value === ALL ? undefined : value })}`, { scroll: false }));

  return (
    <div className="flex flex-wrap items-end gap-3" aria-busy={pending}>
      <Filter label="Modul" value={filters.module} onChange={(v) => set("module", v)} options={modules.map((m) => [m, fmtModule(m)])} />
      <Filter label="Tier" value={filters.tier} onChange={(v) => set("tier", v)} options={TIERS.map((t) => [t, TIER_LABELS[t]])} />
      <Filter
        label="Archetype"
        value={filters.archetype}
        onChange={(v) => set("archetype", v)}
        options={ARCHETYPES.map((a) => [a, ARCHETYPE_LABELS[a]])}
        wide
      />
      <Filter
        label="Status kontak"
        value={filters.status}
        onChange={(v) => set("status", v)}
        options={[
          ["belum", "Belum dihubungi"],
          ["sudah", "Sudah ada catatan"],
        ]}
        wide
      />
      {pending && <Spinner size="sm" className="mb-2.5" />}
      <div className="ml-auto flex items-center gap-2">
        {Object.values(filters).some(Boolean) && (
          <Link href="/prioritas" scroll={false} className={buttonVariants({ variant: "ghost" })}>
            <RotateCcw aria-hidden /> Reset filter
          </Link>
        )}
        <a href={`/prioritas/export${toQuery(filters)}`} className={buttonVariants({ variant: "outline" })}>
          <Download aria-hidden /> Ekspor CSV
        </a>
      </div>
    </div>
  );
}

function Filter({
  label,
  value,
  onChange,
  options,
  wide = false,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  options: [string, string][];
  wide?: boolean;
}) {
  return (
    <Select
      value={value ?? ALL}
      onChange={(k) => onChange(String(k ?? ALL))}
      className={wide ? "w-[200px]" : "w-[148px]"}
    >
      <Label className="text-[13px] font-medium text-ink-3">{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {[[ALL, "Semua"] as [string, string], ...options].map(([id, text]) => (
            <ListBox.Item key={id} id={id} textValue={text}>
              {text}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
