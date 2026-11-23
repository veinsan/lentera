"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGroup, motion } from "motion/react";
import { NAV_GROUPS, NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";

/** The student profile belongs to the worklist. */
export function activeHref(pathname: string) {
  return pathname.startsWith("/mahasiswa") ? "/prioritas" : pathname;
}

/** Placeholder rows while the session streams in, so no link appears that the role cannot open. */
export function NavLinksFallback() {
  return (
    <ul className="flex flex-col gap-1.5 px-1" aria-hidden>
      {NAV_ITEMS.slice(0, 5).map((item) => (
        <li key={item.href} className="h-10 animate-pulse rounded-2xl bg-white/50" />
      ))}
    </ul>
  );
}

/** allowed: hrefs the signed-in role may open (icons stay on the client, so only strings cross the boundary). */
export function NavLinks({ allowed }: { allowed: string[] }) {
  const active = activeHref(usePathname());
  const items = NAV_ITEMS.filter((item) => allowed.includes(item.href));
  return (
    <LayoutGroup id="sidebar-nav">
      <div className="flex flex-col gap-5">
        {NAV_GROUPS.map((group) => {
          const inGroup = items.filter((i) => i.group === group);
          if (!inGroup.length) return null;
          return (
            <div key={group}>
              <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-[0.02em] text-ink-3">{group}</p>
              <ul className="flex flex-col gap-0.5">
                {inGroup.map(({ href, label, icon: Icon, key }) => {
                  const on = active === href || active.startsWith(`${href}/`);
                  return (
                    <li key={href} className="relative">
                      {on && (
                        <motion.span
                          layoutId="nav-active"
                          transition={{ type: "spring", stiffness: 420, damping: 36 }}
                          className="glass glass-lens absolute inset-0 rounded-2xl bg-white/90"
                        />
                      )}
                      <Link
                        href={href}
                        aria-current={on ? "page" : undefined}
                        className={cn(
                          "relative flex h-10 items-center gap-3 rounded-2xl px-3 text-[14px] font-medium transition-colors duration-200",
                          on ? "text-ink" : "text-ink-2 hover:bg-white/45 hover:text-ink",
                        )}
                      >
                        <Icon className={cn("size-[18px] shrink-0", on ? "text-blue" : "text-ink-3")} aria-hidden />
                        <span className="flex-1">{label}</span>
                        <kbd className="hidden font-mono text-[11px] text-ink-3 xl:inline" title={`Tekan ${key}`}>
                          {key}
                        </kbd>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
