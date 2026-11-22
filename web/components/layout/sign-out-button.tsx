"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await createClient().auth.signOut();
          router.replace("/login");
          router.refresh();
        })
      }
      className="flex items-center gap-2 rounded-md px-2 py-1 text-xs text-sidebar-foreground/70 hover:bg-white/10 hover:text-sidebar-foreground disabled:opacity-50"
    >
      <LogOut className="size-3.5" aria-hidden />
      Keluar
    </button>
  );
}
