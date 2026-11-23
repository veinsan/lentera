"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Flag } from "lucide-react";

const KEY = "lentera:last-student";

/** Remembers the student an advisor opened last (this tab only), so the list shows where they stopped. */
export function RememberStudent({ id }: { id: number }) {
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, String(id));
    } catch {
      // storage blocked (private mode): the flag simply does not show
    }
  }, [id]);
  return null;
}

const noop = () => () => {};
const readLast = () => {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export function StoppedFlag({ id }: { id: number }) {
  const last = useSyncExternalStore(noop, readLast, () => null);
  if (last !== String(id)) return null;
  return (
    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-blue-soft px-2 py-0.5 text-[11px] font-semibold text-blue-ink">
      <Flag className="size-3" aria-hidden /> Terakhir dibuka
    </span>
  );
}
