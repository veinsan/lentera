import { Suspense } from "react";
import { ChevronDown } from "lucide-react";
import { NavLinks, NavLinksFallback } from "@/components/layout/nav-links";
import { RoleSwitch } from "@/components/layout/role-switch";
import { Wordmark } from "@/components/layout/wordmark";
import { getCurrentUser, ROLE_LABELS } from "@/lib/auth";
import { fmtModule } from "@/lib/format";
import { NAV_ITEMS } from "@/lib/nav";

export function Sidebar() {
  return (
    <aside data-slate className="flex flex-col gap-4 bg-sidebar px-4 py-4 text-sidebar-foreground lg:fixed lg:inset-y-0 lg:left-0 lg:w-60 lg:gap-8 lg:py-7">
      <div className="px-3">
        <Wordmark />
      </div>
      <nav aria-label="Navigasi utama">
        {/* The session read and usePathname both suspend; keep them inside this boundary. */}
        <Suspense fallback={<NavLinksFallback />}>
          <RoleNav />
        </Suspense>
      </nav>
      <div className="lg:mt-auto">
        <Suspense fallback={null}>
          <UserPanel />
        </Suspense>
      </div>
    </aside>
  );
}

async function RoleNav() {
  const user = await getCurrentUser();
  return <NavLinks allowed={NAV_ITEMS.filter((i) => i.roles.includes(user.role)).map((i) => i.href)} />;
}

async function UserPanel() {
  const user = await getCurrentUser();
  const scope = user.role === "admin" ? "Semua modul" : user.modules.map(fmtModule).join(", ") || "Belum ada modul";
  const who = (
    <>
      <p className="text-sm font-semibold text-white">{user.fullName || user.email}</p>
      <p className="text-xs text-slate-muted">
        {ROLE_LABELS[user.role]} · {scope}
      </p>
    </>
  );
  return (
    <>
      {/* Phones: a compact chip that opens the role switch, so the board keeps the first screen. */}
      <details className="group rounded-2xl bg-slate-raised lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 truncate text-sm font-semibold text-white">
            {ROLE_LABELS[user.role]} <span className="font-normal text-slate-muted">· ganti peran</span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-slate-muted transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="flex flex-col gap-2 px-2 pb-2">
          <div className="px-1">{who}</div>
          <RoleSwitch current={user.role} />
        </div>
      </details>
    <div className="hidden flex-col gap-3 rounded-2xl bg-slate-raised p-3 lg:flex">
      <div className="px-1">
        <p className="text-xs text-slate-muted">Masuk sebagai</p>
        {who}
      </div>
      <RoleSwitch current={user.role} />
      <p className="px-1 text-xs text-slate-muted">Cutoff minggu ke-4, hari ke-28</p>
    </div>
    </>
  );
}
