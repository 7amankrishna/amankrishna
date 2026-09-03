import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/**
 * `robots.txt`.
 *
 * `/admin` was already closed. `/login` and `/api` are added because both were
 * crawlable: the login page is a thin, duplicate-title page with nothing to rank
 * for, and the API routes return JSON that would be indexed as if it were
 * content. Neither is a security boundary — RLS and `public.is_admin()` do that
 * work — this only keeps them out of the index.
 *
 * `sitemap` is absolute and built from `SITE.url`, so a preview deployment never
 * advertises itself.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/login", "/api"],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
