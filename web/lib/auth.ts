import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "advisor" | "coordinator" | "admin";

export const ROLE_LABELS: Record<Role, string> = { advisor: "Konselor", coordinator: "Koordinator", admin: "Admin" };

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  modules: string[];
  accessToken: string;
};

/**
 * Data access layer: the one place that reads the session. Reads cookies, so callers sit inside <Suspense>.
 * cache() shares the result between the sidebar and the page within one request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, modules")
    .eq("id", claims.claims.sub)
    .maybeSingle();
  const { data: session } = await supabase.auth.getSession();
  if (!profile || !session.session) redirect("/login?error=profile");
  return {
    id: claims.claims.sub,
    email: String(claims.claims.email ?? ""),
    fullName: profile.full_name,
    role: profile.role as Role,
    modules: profile.modules ?? [],
    accessToken: session.session.access_token,
  };
});

export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!roles.includes(user.role)) redirect("/dashboard");
  return user;
}
