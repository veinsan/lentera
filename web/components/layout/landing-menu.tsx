"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

/** The landing page's section links on phones, where the inline links are hidden. */
export function LandingMenu({ links }: { links: readonly (readonly [string, string])[] }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent | MouseEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", close);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", close);
    };
  }, [open]);

  return (
    <div ref={root} className="relative md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="landing-menu"
        aria-label={open ? "Tutup menu" : "Buka menu"}
        onClick={() => setOpen((v) => !v)}
        className="grid size-11 place-items-center rounded-full text-night-ink transition-colors hover:bg-white/10"
      >
        {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
      </button>
      {open && (
        <ul id="landing-menu" className="absolute top-14 right-0 w-56 rounded-2xl bg-[rgb(8_22_52)] p-2 text-night-ink shadow-overlay">
          {links.map(([href, label]) => (
            <li key={href}>
              <a href={href} onClick={() => setOpen(false)} className="flex min-h-11 items-center rounded-xl px-3 text-sm transition-colors hover:bg-white/10">
                {label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
