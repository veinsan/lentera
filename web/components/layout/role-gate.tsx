import type { ReactNode } from "react";
import { requireRole, type Role } from "@/lib/auth";

/** Server-side page gate: other roles are redirected to the dashboard. Render inside <Suspense>. */
export async function RoleGate({ roles, children }: { roles: Role[]; children: ReactNode }) {
  await requireRole(...roles);
  return <>{children}</>;
}
