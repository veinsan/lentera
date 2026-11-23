import type { ReactNode } from "react";

/** The screen's finding as one sentence, then its context line; actions sit at the right. */
export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="rise mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="max-w-4xl">
        <h1 className="display text-[1.85rem] text-ink sm:text-[2.6rem]">{title}</h1>
        {description && <p className="mt-3 max-w-[75ch] text-[15px] leading-relaxed text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
