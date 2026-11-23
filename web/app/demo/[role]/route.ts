import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { demoRole } from "@/lib/demo";

// Presenter deep link: /demo/koordinator, /demo/konselor, /demo/admin sign in and open the dashboard.
// Never linked from a page, so no prefetch can trigger it; typed or bookmarked only.
export async function GET(request: NextRequest, ctx: RouteContext<"/demo/[role]">) {
  const { role } = await ctx.params;
  const account = demoRole(role);
  const password = process.env.DEMO_PASSWORD;
  if (!account || !password) return NextResponse.redirect(new URL("/login", request.url));
  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });
  const { error } = await supabase.auth.signInWithPassword({ email: account.email, password });
  return error ? NextResponse.redirect(new URL("/login", request.url)) : response;
}
