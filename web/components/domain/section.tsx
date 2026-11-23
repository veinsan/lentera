import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A paper sheet pinned to the board, titled in condensed Archivo. */
export function Section({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("sheet p-6", className)}>
      <h2 className="font-heading text-xl leading-snug font-bold [font-stretch:92%]">{title}</h2>
      {description && <p className="mt-1 max-w-[75ch] text-sm text-muted-foreground">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
