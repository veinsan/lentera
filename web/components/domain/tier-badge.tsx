import { cn } from "@/lib/utils";
import type { Tier } from "@/lib/api";

export const TIER_LABELS: Record<Tier, string> = { low: "Rendah", watch: "Pantau", high: "Tinggi", critical: "Kritis" };

export const PIN: Record<Tier, string> = {
  low: "bg-risk-low",
  watch: "bg-risk-watch",
  high: "bg-risk-high",
  critical: "bg-risk-critical",
};

/** A tier is a round pin plus its label, so identity never rests on colour alone. */
export function TierPin({ tier, className }: { tier: Tier; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2.5 shrink-0 rounded-full ring-2 ring-card", PIN[tier], className)} />;
}

export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-sans text-xs font-semibold whitespace-nowrap">
      <TierPin tier={tier} />
      {TIER_LABELS[tier]}
    </span>
  );
}
