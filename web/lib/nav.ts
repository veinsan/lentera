import {
  Activity,
  ClipboardList,
  LayoutDashboard,
  Lightbulb,
  ListOrdered,
  Upload,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

// Sidebar order from DESIGN.md (Layout). The student profile opens from the worklist and is not listed.
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/rencana", label: "Rencana Intervensi", icon: ClipboardList },
  { href: "/prioritas", label: "Daftar Prioritas", icon: ListOrdered },
  { href: "/insight", label: "Insight Course", icon: Lightbulb },
  { href: "/unggah", label: "Unggah Kohort", icon: Upload },
  { href: "/model", label: "Model & Monitoring", icon: Activity },
];
