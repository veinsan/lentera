"use client";

import NumberFlow, { type Format, type NumberFlowElement } from "@number-flow/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const FORMATS = {
  int: { maximumFractionDigits: 0 },
  dec2: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  dec4: { minimumFractionDigits: 4, maximumFractionDigits: 4 },
  pct: { style: "percent", maximumFractionDigits: 0 },
  pct1: { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 },
} satisfies Record<string, Format>;

export type StatFormat = keyof typeof FORMATS;

/**
 * A number that rolls to its new value when it changes (NumberFlow, id-ID digits); the server HTML holds the real value.
 * A number below the fold at hydration drops to 0 while unseen and counts up when it scrolls in; one already on screen never flashes.
 */
export function Num({ value, format = "int", prefix, className }: { value: number; format?: StatFormat; prefix?: string; className?: string }) {
  const ref = useRef<NumberFlowElement>(null);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0) return;
    setHidden(true);
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setHidden(false);
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <NumberFlow
      ref={ref}
      value={hidden ? 0 : value}
      locales="id-ID"
      format={FORMATS[format]}
      prefix={prefix}
      className={cn("tabular-nums", className)}
      willChange
    />
  );
}

/** A labelled figure: label, the value, an optional note. `tone` tints the value for risk figures only. */
export function Stat({
  label,
  value,
  format = "int",
  note,
  tone = "ink",
  size = "md",
  className,
}: {
  label: string;
  value: number | null;
  format?: StatFormat;
  note?: React.ReactNode;
  tone?: "ink" | "blue" | "risk";
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[13px] font-medium text-ink-3">{label}</p>
      <p
        className={cn(
          "numeral mt-1.5",
          size === "lg" ? "text-[2.6rem]" : "text-[1.9rem]",
          tone === "blue" && "text-blue",
          tone === "risk" && "text-tier-critical",
        )}
      >
        {value == null ? "-" : <Num value={value} format={format} />}
      </p>
      {note && <p className="mt-1 text-xs leading-snug text-ink-3">{note}</p>}
    </div>
  );
}
