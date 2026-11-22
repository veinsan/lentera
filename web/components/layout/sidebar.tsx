import { Suspense } from "react";
import { Lamp } from "lucide-react";
import { NavLinks, NavLinksFallback } from "@/components/layout/nav-links";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { getCurrentUser, ROLE_LABELS } from "@/lib/auth";
import { fmtModule } from "@/lib/format";
import { NAV_ITEMS } from "@/lib/nav";

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 flex w-60 flex-col bg-sidebar px-4 py-6 text-sidebar-foreground">
      <div className="mb-8 flex items-center gap-2 px-3">
        <Lamp className="size-5 text-brand-accent" aria-hidden />
        <span className="text-lg font-bold tracking-tight">Lentera</span>
      </div>
      <nav aria-label="Navigasi utama">
        {/* The session read and usePathname both suspend; keep them inside this boundary. */}
        <Suspense fallback={<NavLinksFallback />}>
          <RoleNav />
        </Suspense>
      </nav>
      <div className="mt-auto flex flex-col gap-3 px-3">
        <Suspense fallback={null}>
          <UserPanel />
        </Suspense>
        <p className="text-xs text-sidebar-foreground/60">Cutoff minggu ke-4 (hari ke-28)</p>
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
  return (
    <div className="border-t border-sidebar-border pt-3">
      <p className="text-sm font-semibold">{user.fullName || user.email}</p>
      <p className="text-xs text-sidebar-foreground/70">
        {ROLE_LABELS[user.role]} · {scope}
      </p>
      <div className="mt-2 -ml-2">
        <SignOutButton />
      </div>
    </div>
  );
}
