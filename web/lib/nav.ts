import {
  BookOpen,
  ChartScatter,
  ClipboardList,
  CloudUpload,
  Gauge,
  Lightbulb,
  ListOrdered,
  type LucideIcon,
} from "lucide-react";

import type { Role } from "@/lib/auth";

export type NavItem = { href: string; label: string; short: string; icon: LucideIcon; roles: Role[]; group: NavGroup; key: string };
export type NavGroup = "Minggu ini" | "Analisis" | "Data" | "Bantuan";

const ALL: Role[] = ["advisor", "coordinator", "admin"];
const MANAGERS: Role[] = ["coordinator", "admin"];

// Order follows the demo: where the risk is, who to call, how far the hours reach, then the evidence.
// `key` is the presenter shortcut (1 to 7); the student profile opens from the worklist and is not listed.
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "X-Ray kohort", short: "X-Ray", icon: ChartScatter, roles: ALL, group: "Minggu ini", key: "1" },
  { href: "/prioritas", label: "Daftar prioritas", short: "Prioritas", icon: ListOrdered, roles: ALL, group: "Minggu ini", key: "2" },
  { href: "/rencana", label: "Rencana intervensi", short: "Rencana", icon: ClipboardList, roles: MANAGERS, group: "Minggu ini", key: "3" },
  { href: "/insight", label: "Insight course", short: "Insight", icon: Lightbulb, roles: ALL, group: "Analisis", key: "4" },
  { href: "/model", label: "Model & monitoring", short: "Model", icon: Gauge, roles: ALL, group: "Analisis", key: "5" },
  { href: "/unggah", label: "Unggah kohort", short: "Unggah", icon: CloudUpload, roles: MANAGERS, group: "Data", key: "6" },
  { href: "/panduan", label: "Panduan pemakaian", short: "Panduan", icon: BookOpen, roles: ALL, group: "Bantuan", key: "7" },
];

export const NAV_GROUPS: NavGroup[] = ["Minggu ini", "Analisis", "Data", "Bantuan"];
