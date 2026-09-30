import type { MetadataRoute } from "next";
import { SITE, postUrl } from "@/lib/site";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

/**
 * XML sitemap.
 *
 * Two rules this file is written to:
 *
 *   - **`lastModified` is only emitted when a real timestamp exists.** It used to
 *     be `new Date()` for `/` and `/blog`, which told every crawler that both
 *     pages had changed on the exact moment of the fetch. A `lastmod` that is
 *     always "now" is worse than no `lastmod`: Google treats an unreliable one as
 *     noise and stops using it. The blog index borrows the newest article stamp,
 *     which is genuinely when it last changed; the home page gets none.
 *   - **`noindex` articles are excluded.** Listing a URL in a sitemap is a
 *     request to index it, so shipping one the page itself tells robots to skip
 *     is a contradiction — and Search Console reports it as one.
 *
 * Every URL comes from `SITE.url`, which never reads `VERCEL_URL`.
 */

export const revalidate = 300;

type SitemapRow = { slug: string; updated_at: string | null };

/** `new Date(null)` is 1970, so a missing stamp must become `undefined`. */
function stamp(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let rows: SitemapRow[] = [];

  if (supabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("posts")
      .select("slug, updated_at")
      .eq("published", true)
      .neq("robots_index", "noindex")
      .order("published_at", { ascending: false });
    rows = (data ?? []) as SitemapRow[];
  }

  // The index genuinely changed when its newest article did.
  const newest = rows
    .map((row) => row.updated_at)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  const entries: MetadataRoute.Sitemap = [
    {
      url: SITE.url,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${SITE.url}${SITE.blog.base}`,
      lastModified: stamp(newest),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  for (const row of rows) {
    entries.push({
      url: postUrl(row.slug),
      lastModified: stamp(row.updated_at),
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  return entries;
}
