import { Suspense } from "react";
import { Lamp } from "lucide-react";
import { NavLinks, NavLinksFallback } from "@/components/layout/nav-links";

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 flex w-60 flex-col bg-sidebar px-4 py-6 text-sidebar-foreground">
      <div className="mb-8 flex items-center gap-2 px-3">
        <Lamp className="size-5 text-brand-accent" aria-hidden />
        <span className="text-lg font-bold tracking-tight">Lentera</span>
      </div>
      <nav aria-label="Navigasi utama">
        {/* usePathname suspends on dynamic routes (mahasiswa/[id]); keep the read inside this boundary. */}
        <Suspense fallback={<NavLinksFallback />}>
          <NavLinks />
        </Suspense>
      </nav>
      <p className="mt-auto px-3 text-xs text-sidebar-foreground/60">Cutoff minggu ke-4 (hari ke-28)</p>
    </aside>
  );
}
