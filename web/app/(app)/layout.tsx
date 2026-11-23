import { Suspense } from "react";
import { AtlasBackdrop } from "@/components/layout/atlas-backdrop";
import { CommandPalette } from "@/components/layout/command-palette";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { getCurrentUser, ROLE_LABELS } from "@/lib/auth";
import { NAV_ITEMS } from "@/lib/nav";

export default function AppLayout({ children, panel }: LayoutProps<"/">) {
  return (
    <>
      <AtlasBackdrop />
      <a
        href="#konten"
        className="sr-only z-50 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-ink focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        Lewati ke konten
      </a>
      <Sidebar />
      <Suspense fallback={null}>
        <ShellControls />
      </Suspense>
      <main id="konten" className="px-4 pt-6 pb-28 sm:px-6 lg:pt-9 lg:pr-9 lg:pb-14 lg:pl-[300px]">
        <div className="mx-auto max-w-[1360px]">{children}</div>
      </main>
      {panel}
    </>
  );
}

/** Phone navigation and the command palette need the role; they stream in after the session read. */
async function ShellControls() {
  const user = await getCurrentUser();
  const allowed = NAV_ITEMS.filter((i) => i.roles.includes(user.role)).map((i) => i.href);
  return (
    <>
      <MobileNav allowed={allowed} role={user.role} who={`${user.fullName || user.email} (${ROLE_LABELS[user.role]})`} />
      <CommandPalette allowed={allowed} role={user.role} />
    </>
  );
}
