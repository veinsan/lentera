import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A solid content plate: the reading layer under the glass navigation. */
export function Section({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  id,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("plate p-5 sm:p-6", className)}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
          {description && <p className="mt-1 max-w-[75ch] text-sm leading-relaxed text-ink-3">{description}</p>}
        </div>
        {actions}
      </header>
      <div className={cn("mt-5", bodyClassName)}>{children}</div>
    </section>
  );
}
