import {
  Activity,
  ClipboardList,
  LayoutDashboard,
  Lightbulb,
  ListOrdered,
  Upload,
  type LucideIcon,
} from "lucide-react";

import type { Role } from "@/lib/auth";

export type NavItem = { href: string; label: string; icon: LucideIcon; roles: Role[] };

const ALL: Role[] = ["advisor", "coordinator", "admin"];
const MANAGERS: Role[] = ["coordinator", "admin"];

// Sidebar order from DESIGN.md (Layout). The student profile opens from the worklist and is not listed.
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ALL },
  { href: "/rencana", label: "Rencana Intervensi", icon: ClipboardList, roles: MANAGERS },
  { href: "/prioritas", label: "Daftar Prioritas", icon: ListOrdered, roles: ALL },
  { href: "/insight", label: "Insight Course", icon: Lightbulb, roles: ALL },
  { href: "/unggah", label: "Unggah Kohort", icon: Upload, roles: MANAGERS },
  { href: "/model", label: "Model & Monitoring", icon: Activity, roles: ALL },
];
