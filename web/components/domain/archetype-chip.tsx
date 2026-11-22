import { BookX, FileX, MonitorOff, TrendingDown, UserCheck, UserX, type LucideIcon } from "lucide-react";
import { ARCHETYPE_LABELS } from "@/lib/labels";

// Archetypes get an icon and a neutral chip, never their own color (DESIGN.md Components).
const ICONS: Record<string, LucideIcon> = {
  silent: UserX,
  no_lms_record: MonitorOff,
  missed_submission: FileX,
  low_score: BookX,
  fading: TrendingDown,
  engaged: UserCheck,
};

export function ArchetypeChip({ archetype }: { archetype: string }) {
  const Icon = ICONS[archetype] ?? UserCheck;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-sm bg-muted px-2 py-0.5 text-xs font-medium">
      <Icon className="size-3.5" aria-hidden />
      {ARCHETYPE_LABELS[archetype] ?? archetype}
    </span>
  );
}
