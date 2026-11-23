import { Suspense } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/brand/lantern-mark";
import { NavLinks, NavLinksFallback } from "@/components/layout/nav-links";
import { RoleSwitch } from "@/components/layout/role-switch";
import { SearchTrigger } from "@/components/layout/command-palette";
import { getCurrentUser, ROLE_LABELS } from "@/lib/auth";
import { fmtModule } from "@/lib/format";
import { NAV_ITEMS } from "@/lib/nav";

/** Floating liquid-glass rail over the atlas plate (lg and up). Phones get MobileNav instead. */
export function Sidebar() {
  return (
    <aside className="glass fixed inset-y-3 left-3 z-30 hidden w-[264px] flex-col rounded-[28px] px-3 pt-5 pb-3 lg:flex">
      <Link href="/" className="mx-3 mb-5 self-start rounded-lg text-ink" aria-label="Lentera, ke halaman depan">
        <Wordmark star="var(--blue)" />
      </Link>
      <div className="mb-5 px-1">
        <SearchTrigger />
      </div>
      <nav aria-label="Navigasi utama" className="min-h-0 flex-1 overflow-y-auto px-1">
        {/* The session read and usePathname both suspend; keep them inside this boundary. */}
        <Suspense fallback={<NavLinksFallback />}>
          <RoleNav />
        </Suspense>
      </nav>
      <Suspense fallback={<div className="h-36 rounded-2xl bg-white/40" />}>
        <UserCard />
      </Suspense>
    </aside>
  );
}

async function RoleNav() {
  const user = await getCurrentUser();
  return <NavLinks allowed={NAV_ITEMS.filter((i) => i.roles.includes(user.role)).map((i) => i.href)} />;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

async function UserCard() {
  const user = await getCurrentUser();
  const scope =
    user.role === "admin" ? "semua modul" : user.modules.length ? new Intl.ListFormat("id-ID").format(user.modules.map(fmtModule)) : "belum ada modul";
  return (
    <div className="rounded-[22px] bg-white/60 p-2.5 shadow-[0_1px_2px_rgb(11_27_58/0.06)]">
      <div className="mb-3 flex items-center gap-3 px-1">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blue text-[13px] font-semibold text-white">
          {initials(user.fullName || user.email)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{user.fullName || user.email}</p>
          <p className="truncate text-xs text-ink-3">
            {ROLE_LABELS[user.role]}, {scope}
          </p>
        </div>
      </div>
      <RoleSwitch current={user.role} />
    </div>
  );
}
