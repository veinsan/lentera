import { BookX, FileX, MonitorOff, TrendingDown, UserCheck, UserX, type LucideIcon } from "lucide-react";
import { ARCHETYPE_LABELS } from "@/lib/labels";

// Archetypes carry an icon and a neutral chip, never a risk colour: warm hues belong to tiers.
export const ARCHETYPE_ICONS: Record<string, LucideIcon> = {
  silent: UserX,
  no_lms_record: MonitorOff,
  missed_submission: FileX,
  low_score: BookX,
  fading: TrendingDown,
  engaged: UserCheck,
};

export function ArchetypeChip({ archetype }: { archetype: string }) {
  const Icon = ARCHETYPE_ICONS[archetype] ?? UserCheck;
  return (
    <span className="inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full bg-blue-soft px-2.5 text-xs font-medium text-blue-ink">
      <Icon className="size-3.5" aria-hidden />
      {ARCHETYPE_LABELS[archetype] ?? archetype}
    </span>
  );
}
