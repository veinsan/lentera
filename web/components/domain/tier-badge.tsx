import { cn } from "@/lib/utils";
import type { Tier } from "@/lib/api";

export const TIER_LABELS: Record<Tier, string> = { low: "Rendah", watch: "Pantau", high: "Tinggi", critical: "Kritis" };
export const TIER_ORDER: Tier[] = ["critical", "high", "watch", "low"];

export const TIER_BG: Record<Tier, string> = {
  low: "bg-tier-low",
  watch: "bg-tier-watch",
  high: "bg-tier-high",
  critical: "bg-tier-critical",
};
export const TIER_TEXT: Record<Tier, string> = {
  low: "text-tier-low",
  watch: "text-tier-watch",
  high: "text-tier-high",
  critical: "text-tier-critical",
};

/** A tier is a star dot plus its label; dot size grows with risk, so identity never rests on colour alone. */
export function TierDot({ tier, className }: { tier: Tier; className?: string }) {
  const size = { low: "size-2", watch: "size-2.5", high: "size-2.5", critical: "size-3" }[tier];
  return <span aria-hidden className={cn("inline-block shrink-0 rounded-full ring-2 ring-white", size, TIER_BG[tier], className)} />;
}

export function TierBadge({ tier, className }: { tier: Tier; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[13px] font-semibold whitespace-nowrap text-ink", className)}>
      <TierDot tier={tier} />
      {TIER_LABELS[tier]}
    </span>
  );
}
