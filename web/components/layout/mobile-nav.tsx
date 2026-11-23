"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Drawer } from "@heroui/react";
import { Menu, Search } from "lucide-react";
import { Wordmark } from "@/components/brand/lantern-mark";
import { activeHref } from "@/components/layout/nav-links";
import { RoleSwitch } from "@/components/layout/role-switch";
import type { Role } from "@/lib/auth";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";

/** Phones: a glass top bar and a floating glass tab bar; everything else lives in the menu sheet. */
export function MobileNav({ allowed, role, who }: { allowed: string[]; role: Role; who: string }) {
  const active = activeHref(usePathname());
  const [menu, setMenu] = useState(false);
  const items = NAV_ITEMS.filter((i) => allowed.includes(i.href));
  const tabs = items.slice(0, 4);

  return (
    <>
      <header className="glass sticky top-2 z-30 mx-3 mt-2 flex h-14 items-center justify-between rounded-[22px] px-4 lg:hidden">
        <Link href="/" aria-label="Lentera, ke halaman depan" className="text-ink">
          <Wordmark star="var(--blue)" />
        </Link>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("lentera:palette"))}
          className="grid size-11 place-items-center rounded-full text-ink-2 hover:bg-white/60"
          aria-label="Cari mahasiswa atau halaman"
        >
          <Search className="size-5" aria-hidden />
        </button>
      </header>

      <nav
        aria-label="Navigasi utama"
        className="glass fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-30 flex h-16 items-stretch justify-around rounded-full px-1.5 lg:hidden"
      >
        {tabs.map(({ href, short, icon: Icon }) => {
          const on = active === href || active.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={on ? "page" : undefined}
              className={cn(
                "my-1.5 flex min-w-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-medium transition-colors",
                on ? "bg-white/90 text-ink shadow-[0_1px_3px_rgb(11_27_58/0.12)]" : "text-ink-2",
              )}
            >
              <Icon className={cn("size-5", on ? "text-blue" : "text-ink-3")} aria-hidden />
              {short}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMenu(true)}
          className="my-1.5 flex min-w-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-medium text-ink-2"
        >
          <Menu className="size-5 text-ink-3" aria-hidden />
          Menu
        </button>
      </nav>

      <Drawer.Backdrop isOpen={menu} onOpenChange={setMenu} variant="blur">
        <Drawer.Content placement="bottom">
          <Drawer.Dialog aria-label="Menu" className="rounded-t-[28px] pb-[max(16px,env(safe-area-inset-bottom))]">
            <Drawer.Handle />
            <Drawer.Body className="flex flex-col gap-4 px-5">
              <ul className="grid grid-cols-2 gap-2">
                {items.map(({ href, label, icon: Icon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setMenu(false)}
                      className={cn(
                        "flex h-12 items-center gap-2.5 rounded-2xl px-3 text-sm font-medium",
                        active === href ? "bg-blue-soft text-blue-ink" : "bg-surface-secondary text-ink",
                      )}
                    >
                      <Icon className="size-[18px]" aria-hidden />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div>
                <p className="mb-2 text-xs text-ink-3">Masuk sebagai {who}</p>
                <RoleSwitch current={role} />
              </div>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </>
  );
}
