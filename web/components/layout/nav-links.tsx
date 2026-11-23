"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav";

/** Placeholder rows while the session streams in, so no link appears that the role cannot open. */
export function NavLinksFallback() {
  return (
    <ul className="flex flex-col gap-1" aria-hidden>
      {NAV_ITEMS.slice(0, 4).map((item) => (
        <li key={item.href} className="h-10 animate-pulse rounded-xl bg-slate-raised" />
      ))}
    </ul>
  );
}

/** allowed: hrefs the signed-in role may open (icons stay on the client, so only strings cross the boundary). */
export function NavLinks({ allowed }: { allowed: string[] }) {
  const pathname = usePathname();
  // The student profile belongs to the worklist.
  const active = pathname.startsWith("/mahasiswa") ? "/prioritas" : pathname;
  return (
    <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
      {NAV_ITEMS.filter((item) => allowed.includes(item.href)).map(({ href, label, icon: Icon }) => {
        const isActive = active === href || active.startsWith(`${href}/`);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-slate-muted hover:bg-slate-raised hover:text-sidebar-foreground",
              )}
            >
              <Icon className={cn("size-4", isActive && "text-brand-accent")} aria-hidden />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
