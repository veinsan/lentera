"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowRight, LoaderCircle, ShieldCheck, UserRound, Users } from "lucide-react";
import { DEMO_ROLES } from "@/lib/demo";
import { signInAs } from "@/lib/demo-actions";
import { cn } from "@/lib/utils";

const ICONS = { koordinator: Users, konselor: UserRound, admin: ShieldCheck } as const;

/** Three demo roles; one click (or Alt+1/2/3 for the presenter) signs in. `tone` follows the plate it sits on. */
export function DemoSignIn({ tone = "night", layout = "stack" }: { tone?: "night" | "day"; layout?: "stack" | "row" }) {
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

  const night = tone === "night";
  return (
    <div className="flex flex-col gap-4">
      <ul className={cn("grid gap-3", layout === "row" && "md:grid-cols-3")}>
        {DEMO_ROLES.map((r, i) => {
          const busy = pendingKey === r.key;
          const Icon = ICONS[r.key];
          return (
            <li key={r.key} className="rise" style={{ "--i": i + 2 } as React.CSSProperties}>
              <button
                type="button"
                onClick={() => enter(r.key)}
                disabled={pendingKey !== null}
                aria-describedby={`${r.key}-does`}
                className={cn(
                  "group grid h-full w-full grid-cols-[auto_1fr_auto] items-start gap-x-4 gap-y-1 rounded-[22px] p-5 text-left transition-[transform,background-color,box-shadow] duration-300 ease-out-expo hover:-translate-y-0.5 disabled:cursor-wait",
                  night ? "border border-night-line bg-night-2 hover:bg-night-3 hover:shadow-[0_18px_40px_-20px_rgb(0_0_0/0.6)]" : "plate hover:shadow-lift",
                )}
              >
                <span
                  className={cn(
                    "row-span-2 grid size-11 place-items-center rounded-2xl",
                    night ? "bg-white/10 text-night-ink" : "bg-blue-soft text-blue",
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className={cn("text-lg font-semibold tracking-[-0.01em]", night ? "text-night-ink" : "text-ink")}>{r.label}</span>
                <span
                  className={cn(
                    "row-span-2 grid size-10 place-items-center self-center rounded-full transition-colors duration-200",
                    night ? "bg-white text-night group-hover:bg-blue group-hover:text-white" : "bg-blue text-white group-hover:bg-blue-hover",
                  )}
                >
                  {busy ? <LoaderCircle className="size-[18px] animate-spin" aria-hidden /> : <ArrowRight className="size-[18px]" aria-hidden />}
                </span>
                <span id={`${r.key}-does`} className={cn("text-sm leading-relaxed", night ? "text-night-muted" : "text-ink-3")}>
                  <span className={cn("font-semibold", night ? "text-night-ink" : "text-ink")}>{r.scope}.</span> {r.does}{" "}
                  <kbd className={cn("ml-1 font-mono text-[11px]", night ? "text-night-muted" : "text-ink-3")}>Alt {r.shortcut}</kbd>
                </span>
                <span className="sr-only">{busy ? "Sedang masuk" : `Masuk sebagai ${r.label}`}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className={cn("text-sm font-medium", night ? "text-[#ffb4ab]" : "text-danger")}>
          {error}
        </p>
      )}
    </div>
  );
}
