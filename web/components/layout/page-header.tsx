import type { ReactNode } from "react";

/** Page title as the screen's finding, in condensed Archivo; the description carries the context line. */
export function PageHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-4xl">
        <h1 className="font-heading text-[1.75rem] leading-[1.05] sm:text-[2.25rem] font-bold tracking-[-0.025em] text-balance [font-stretch:88%]">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      {actions}
    </header>
  );
}
