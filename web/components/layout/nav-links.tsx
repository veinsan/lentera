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
        <li key={item.href} className="h-9 animate-pulse rounded-md bg-white/10" />
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
    <ul className="flex flex-col gap-1">
      {NAV_ITEMS.filter((item) => allowed.includes(item.href)).map(({ href, label, icon: Icon }) => {
        const isActive = active === href || active.startsWith(`${href}/`);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-white/10 hover:text-sidebar-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
