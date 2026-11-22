"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav";

/** Static links for the prerendered shell; NavLinks replaces them once the pathname is known. */
export function NavLinksFallback() {
  return <LinkList active={null} />;
}

export function NavLinks() {
  const pathname = usePathname();
  // The student profile belongs to the worklist.
  const active = pathname.startsWith("/mahasiswa") ? "/prioritas" : pathname;
  return <LinkList active={active} />;
}

function LinkList({ active }: { active: string | null }) {
  return (
    <ul className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = active !== null && (active === href || active.startsWith(`${href}/`));
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
