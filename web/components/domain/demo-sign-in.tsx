"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { DEMO_ROLES } from "@/lib/demo";
import { signInAs } from "@/lib/demo-actions";
import { cn } from "@/lib/utils";

/** Three pinned role sheets; one click (or Alt+1/2/3 for the presenter) signs in. */
export function DemoSignIn() {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  function enter(key: string) {
    setError(null);
    setPendingKey(key);
    start(async () => {
      const res = await signInAs(key); // redirects on success
      setError(res.error);
      setPendingKey(null);
    });
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const role = DEMO_ROLES.find((r) => e.code === `Digit${r.shortcut}`);
      if (!role) return;
      e.preventDefault();
      enter(role.key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid gap-4">
        {DEMO_ROLES.map((r) => {
          const busy = pendingKey === r.key;
          return (
            <li key={r.key}>
              <button
                type="button"
                onClick={() => enter(r.key)}
                disabled={pendingKey !== null}
                aria-describedby={`${r.key}-does`}
                className={cn(
                  "sheet group relative grid w-full grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1 px-7 py-5 text-left transition",
                  "hover:-translate-y-0.5 hover:shadow-overlay disabled:cursor-wait disabled:opacity-70",
                )}
              >
                <span
                  aria-hidden
                  className="absolute -top-1.5 left-1/2 size-3.5 -translate-x-1/2 rounded-full bg-foreground transition-colors group-hover:bg-brand-accent group-hover:ring-2 group-hover:ring-foreground"
                />
                <span className="font-heading text-2xl font-bold [font-stretch:92%]">{r.label}</span>
                <span className="row-span-2 flex items-center gap-3">
                  <kbd className="rounded-md border border-border px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                    Alt {r.shortcut}
                  </kbd>
                  <span className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground transition group-hover:bg-brand-accent group-hover:text-brand-accent-foreground">
                    {busy ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <ArrowRight className="size-5" aria-hidden />}
                  </span>
                </span>
                <span id={`${r.key}-does`} className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{r.scope}.</span> {r.does}
                </span>
                <span className="sr-only">{busy ? "Sedang masuk" : `Masuk sebagai ${r.label}`}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
