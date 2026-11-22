import { cn } from "@/lib/utils";
import type { Tier } from "@/lib/api";

export const TIER_LABELS: Record<Tier, string> = { low: "Rendah", watch: "Pantau", high: "Tinggi", critical: "Kritis" };

// Text color per tier follows the contrast checks recorded in DESIGN.md.
const STYLES: Record<Tier, string> = {
  low: "bg-risk-low text-on-risk-light",
  watch: "bg-risk-watch text-on-risk-light",
  high: "bg-risk-high text-on-risk-dark",
  critical: "bg-risk-critical text-on-risk-dark",
};

export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 font-sans text-xs font-semibold", STYLES[tier])}>
      {TIER_LABELS[tier]}
    </span>
  );
}
