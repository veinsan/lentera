"use client";

import { useTransition } from "react";
import { LoaderCircle, LogOut } from "lucide-react";
import { DEMO_ROLES } from "@/lib/demo";
import { signInAs, signOut } from "@/lib/demo-actions";
import type { Role } from "@/lib/auth";
import { cn } from "@/lib/utils";

/** One-click role switch for the presenter: signs in as another seeded demo account. */
export function RoleSwitch({ current }: { current: Role }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-label="Ganti peran demo" className="grid grid-cols-3 gap-0.5 rounded-xl bg-slate p-1 lg:grid-cols-1">
        {DEMO_ROLES.map((r) => {
          const on = r.role === current;
          return (
            <button
              key={r.key}
              type="button"
              disabled={on || pending}
              aria-pressed={on}
              onClick={() => start(async () => void (await signInAs(r.key)))}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-center text-xs font-semibold transition-colors lg:text-left",
                on ? "bg-brand-accent text-brand-accent-foreground" : "text-slate-muted hover:bg-slate-line hover:text-slate-foreground",
                pending && !on && "cursor-wait",
              )}
            >
              {r.label}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => await signOut())}
        className="flex items-center gap-2 self-start rounded-md px-1 py-1 text-xs text-slate-muted hover:text-slate-foreground disabled:opacity-50"
      >
        {pending ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : <LogOut className="size-3.5" aria-hidden />}
        {pending ? "Berpindah..." : "Keluar"}
      </button>
    </div>
  );
}
