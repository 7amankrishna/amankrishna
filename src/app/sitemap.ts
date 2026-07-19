import type { MetadataRoute } from "next";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { SITE } from "@/lib/utils";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: SITE.url,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${SITE.url}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  // Published articles get their own sitemap entries.
  if (supabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("posts")
      .select("slug, updated_at")
      .eq("published", true);
    for (const p of data ?? []) {
      entries.push({
        url: `${SITE.url}/blog/${p.slug}`,
        lastModified: new Date(p.updated_at),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

  return entries;
}
