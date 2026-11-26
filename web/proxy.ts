import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// App routes that need a session. Anything else (landing, sign-in, demo links, unknown paths) passes through, so an
// unknown URL shows the 404 page instead of the sign-in page.
const APP_ROUTES = ["/dashboard", "/prioritas", "/rencana", "/insight", "/model", "/unggah", "/mahasiswa", "/panduan"];
const PROTECTED = (path: string) => APP_ROUTES.some((r) => path === r || path.startsWith(`${r}/`));

/**
 * Refreshes the Supabase session cookies and makes the optimistic sign-in redirect.
 * Authorization itself happens on the server: getCurrentUser() for pages, token verification in the API.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(toSet, headers) {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // getClaims verifies the JWT signature against the project's JWKS.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const path = request.nextUrl.pathname;

  if (!signedIn && PROTECTED(path)) return redirectWithCookies(request, "/login", response);
  if (signedIn && path.startsWith("/login")) return redirectWithCookies(request, "/dashboard", response);
  return response;
}

function redirectWithCookies(request: NextRequest, path: string, from: NextResponse) {
  const redirect = NextResponse.redirect(new URL(path, request.url));
  from.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}

export const config = {
  // Static files from public/ and the generated metadata images skip the session check.
  matcher: ["/((?!_next/static|_next/image|atlas/|illustrations/|icon.svg|robots.txt|sitemap.xml|opengraph-image).*)"],
};
