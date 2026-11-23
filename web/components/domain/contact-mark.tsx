import { CalendarClock, CircleCheck, CircleDashed, PhoneOff } from "lucide-react";
import { CONTACT_STATUS_LABELS, NOT_CONTACTED } from "@/lib/labels";
import { cn } from "@/lib/utils";

// Contact state is a mark, not a hue: each status has its own glyph, read before its colour.
const MARKS = {
  contacted: { icon: CircleCheck, className: "text-success" },
  scheduled: { icon: CalendarClock, className: "text-blue-ink" },
  unreachable: { icon: PhoneOff, className: "text-ink-2" },
} as const;

export function ContactMark({ status }: { status: string | undefined }) {
  const mark = status ? MARKS[status as keyof typeof MARKS] : undefined;
  const Icon = mark?.icon ?? CircleDashed;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[13px] whitespace-nowrap", mark ? "font-medium text-ink" : "text-ink-3")}>
      <Icon className={cn("size-4", mark?.className ?? "text-ink-3")} aria-hidden />
      {status ? (CONTACT_STATUS_LABELS[status] ?? status) : NOT_CONTACTED}
    </span>
  );
}
