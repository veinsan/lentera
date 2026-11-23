"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "@heroui/react";
import { ExternalLink } from "lucide-react";

/**
 * The student profile as a side sheet over the page it was opened from (an intercepted route).
 * Closing returns to that page with its filters and scroll intact; "Halaman penuh" reloads the plain route.
 */
export function StudentPanel({ id, children }: { id: string; children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  return (
    <Drawer.Backdrop
      isOpen={open}
      variant="blur"
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) router.back();
      }}
    >
      <Drawer.Content placement="right">
        <Drawer.Dialog aria-label="Profil mahasiswa" className="glass h-full w-full max-w-none overflow-x-hidden overflow-y-auto rounded-none bg-paper/90 p-0 sm:w-[min(760px,92vw)] sm:rounded-l-[28px]">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 pt-4 pb-2">
            <a
              href={`/mahasiswa/${id}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ink-2 hover:bg-white/70 hover:text-ink"
            >
              <ExternalLink className="size-4" aria-hidden /> Halaman penuh
            </a>
            <Drawer.CloseTrigger aria-label="Tutup profil" />
          </div>
          <Drawer.Body className="px-5 pb-8">{children}</Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  );
}
