import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lentera-khaki.vercel.app";

// Only the landing page is public; every app route needs a demo sign-in, so crawlers stay on /.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/prioritas", "/rencana", "/insight", "/model", "/unggah", "/mahasiswa", "/demo", "/login"] },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
