"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Modal } from "@heroui/react";
import { ArrowRight, CornerDownLeft, LogOut, Search, UserRound } from "lucide-react";
import { DEMO_ROLES } from "@/lib/demo";
import { signInAs, signOut } from "@/lib/demo-actions";
import { ARCHETYPE_LABELS } from "@/lib/labels";
import { NAV_ITEMS } from "@/lib/nav";
import type { Role } from "@/lib/auth";

const OPEN_EVENT = "lentera:palette";
const TIERS = [
  ["critical", "Kritis"],
  ["high", "Tinggi"],
  ["watch", "Pantau"],
] as const;

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || Boolean(t.closest("input, textarea, select, [role='textbox']")));

/** The rail's search field; opens the palette anywhere through a window event. */
export function SearchTrigger() {
  const mac = useSyncExternalStore(
    () => () => {},
    () => /Mac|iPhone|iPad/.test(navigator.platform),
    () => false,
  );
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
      className="flex h-10 w-full items-center gap-2.5 rounded-2xl bg-white/70 px-3 text-left text-sm text-ink-3 shadow-[inset_0_0_0_1px_rgb(11_27_58/0.06)] transition-colors hover:bg-white hover:text-ink-2"
    >
      <Search className="size-4" aria-hidden />
      <span className="flex-1 truncate">Cari mahasiswa</span>
      <kbd className="rounded-md bg-ink/[0.06] px-1.5 py-0.5 font-mono text-[11px] text-ink-2">{mac ? "⌘K" : "Ctrl K"}</kbd>
    </button>
  );
}

/**
 * Presenter keyboard: Ctrl/⌘+K or / opens the palette, 1 to 7 jump to pages (when not typing), Esc closes.
 * Students open by ID; the profile route checks access on the server, so the palette needs no student data.
 */
export function CommandPalette({ allowed, role }: { allowed: string[]; role: Role }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [, start] = useTransition();
  const pages = NAV_ITEMS.filter((i) => allowed.includes(i.href));

  useEffect(() => {
    const show = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (open || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (e.key === "/") {
        e.preventDefault();
        setOpen(true);
        return;
      }
      const page = pages.find((p) => p.key === e.key);
      if (page) router.push(page.href);
    };
    window.addEventListener(OPEN_EVENT, show);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_EVENT, show);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, pages, router]);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };
  const id = query.trim().match(/^\d{1,9}$/)?.[0];

  return (
    <Modal.Backdrop isOpen={open} onOpenChange={setOpen} variant="blur">
      <Modal.Container placement="top" size="lg">
        <Modal.Dialog aria-label="Cari di Lentera" className="overflow-hidden rounded-3xl p-0">
          <Command label="Cari di Lentera" shouldFilter loop className="flex max-h-[min(70vh,560px)] flex-col">
            <div className="flex items-center gap-3 border-b border-separator px-5">
              <Search className="size-5 text-ink-3" aria-hidden />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                autoFocus
                placeholder="Ketik ID mahasiswa, halaman, tier, atau archetype"
                className="h-14 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
              />
              <kbd className="rounded-md bg-default px-1.5 py-0.5 font-mono text-[11px] text-ink-2">Esc</kbd>
            </div>
            <Command.List className="overflow-y-auto p-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-ink-3">
              <Command.Empty className="px-3 py-8 text-center text-sm text-ink-3">
                Tidak ada yang cocok. Ketik ID mahasiswa dalam angka untuk membuka profilnya.
              </Command.Empty>
              {id && (
                <Command.Group heading="Mahasiswa">
                  <Item value={`mahasiswa ${id}`} onSelect={() => go(`/mahasiswa/${id}`)} icon={<UserRound className="size-4" />}>
                    Buka mahasiswa <span className="font-mono font-semibold">{id}</span>
                  </Item>
                </Command.Group>
              )}
              <Command.Group heading="Halaman">
                {pages.map((p) => (
                  <Item key={p.href} value={`halaman ${p.label}`} onSelect={() => go(p.href)} icon={<p.icon className="size-4" />} hint={p.key}>
                    {p.label}
                  </Item>
                ))}
              </Command.Group>
              <Command.Group heading="Daftar prioritas">
                {TIERS.map(([t, label]) => (
                  <Item key={t} value={`tier ${label}`} onSelect={() => go(`/prioritas?tier=${t}`)} icon={<ArrowRight className="size-4" />}>
                    Tier {label}
                  </Item>
                ))}
                {Object.entries(ARCHETYPE_LABELS).map(([a, label]) => (
                  <Item key={a} value={`archetype ${label}`} onSelect={() => go(`/prioritas?archetype=${a}`)} icon={<ArrowRight className="size-4" />}>
                    {label}
                  </Item>
                ))}
              </Command.Group>
              <Command.Group heading="Peran demo">
                {DEMO_ROLES.filter((r) => r.role !== role).map((r) => (
                  <Item
                    key={r.key}
                    value={`peran ${r.label}`}
                    onSelect={() => start(async () => void (await signInAs(r.key)))}
                    icon={<UserRound className="size-4" />}
                  >
                    Masuk sebagai {r.label} <span className="text-ink-3">({r.scope})</span>
                  </Item>
                ))}
                <Item value="keluar" onSelect={() => start(async () => await signOut())} icon={<LogOut className="size-4" />}>
                  Keluar
                </Item>
              </Command.Group>
            </Command.List>
            <div className="flex items-center gap-4 border-t border-separator px-5 py-2.5 text-xs text-ink-3">
              <span className="inline-flex items-center gap-1.5">
                <CornerDownLeft className="size-3.5" aria-hidden /> buka
              </span>
              <span>↑ ↓ pilih</span>
              <span>1 sampai 6 pindah halaman</span>
            </div>
          </Command>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

function Item({
  value,
  onSelect,
  icon,
  hint,
  children,
}: {
  value: string;
  onSelect: () => void;
  icon: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm text-ink-2 data-[selected=true]:bg-blue-soft data-[selected=true]:text-ink [&_svg]:text-ink-3 data-[selected=true]:[&_svg]:text-blue"
    >
      {icon}
      <span className="flex-1 truncate">{children}</span>
      {hint && <kbd className="font-mono text-[11px] text-ink-3">{hint}</kbd>}
    </Command.Item>
  );
}
