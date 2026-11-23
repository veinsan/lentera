"use client";

import { useTransition } from "react";
import { toast } from "@heroui/react";
import { Check, LoaderCircle, LogOut } from "lucide-react";
import { DEMO_ROLES } from "@/lib/demo";
import { signInAs, signOut } from "@/lib/demo-actions";
import type { Role } from "@/lib/auth";
import { cn } from "@/lib/utils";

/** One-click role switch for the presenter: signs in as another seeded demo account. */
export function RoleSwitch({ current }: { current: Role }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-1">
      <p className="px-1 pb-1 text-[11px] font-semibold text-ink-3">Ganti peran demo</p>
      <div role="group" aria-label="Ganti peran demo" className="flex flex-col gap-0.5">
        {DEMO_ROLES.map((r) => {
          const on = r.role === current;
          return (
            <button
              key={r.key}
              type="button"
              disabled={on || pending}
              aria-pressed={on}
              onClick={() =>
                start(async () => {
                  const res = await signInAs(r.key); // redirects on success
                  if (res.error) toast.danger(res.error);
                })
              }
              className={cn(
                "flex h-9 items-center gap-2 rounded-xl px-2.5 text-left text-[13px] transition-colors duration-200",
                on ? "bg-white font-semibold text-ink shadow-[0_1px_3px_rgb(11_27_58/0.12)]" : "text-ink-2 hover:bg-white/60 hover:text-ink",
                pending && !on && "cursor-wait",
              )}
            >
              <span className="flex-1">{r.label}</span>
              <span className="text-[11px] text-ink-3">{r.scope}</span>
              {on && <Check className="size-3.5 text-blue" aria-hidden />}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => await signOut())}
        className="mt-1 flex h-9 items-center gap-2 self-start rounded-lg px-2.5 text-[13px] font-medium text-ink-2 hover:text-ink disabled:opacity-60"
      >
        {pending ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : <LogOut className="size-3.5" aria-hidden />}
        {pending ? "Berpindah..." : "Keluar"}
      </button>
    </div>
  );
}
