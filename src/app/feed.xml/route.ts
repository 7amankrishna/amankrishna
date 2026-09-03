import { resolveBodyHtml } from "@/lib/content/blocks-to-html";
import { sanitizeArticleHtml } from "@/lib/content/sanitize";
import type { Post } from "@/lib/posts";
import { resolveArticleSeo } from "@/lib/seo/metadata";
import { SITE, postUrl } from "@/lib/site";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

/**
 * RSS 2.0 feed. The actions have been calling `revalidatePath("/feed.xml")`
 * against this path since the upgrade landed; this is the route it was promising.
 *
 * Three decisions worth knowing:
 *
 *   - **Every URL is built from `SITE.url`**, which never reads `VERCEL_URL`, so
 *     a preview deployment cannot publish links to itself.
 *   - **`lastBuildDate` is the newest real `updated_at`**, not "now". A feed that
 *     claims to have changed on every fetch is the same lie as a fabricated
 *     `lastmod` in the sitemap.
 *   - **`noindex` articles are excluded**, matching the sitemap. The flag is the
 *     author saying "do not surface this page"; a feed is machine distribution.
 *     Flip the filter below if that reading ever changes.
 */

export const revalidate = 300;

type FeedRow = Pick<
  Post,
  | "slug"
  | "title"
  | "excerpt"
  | "blocks"
  | "content_html"
  | "seo_title"
  | "seo_description"
  | "og_title"
  | "og_description"
  | "twitter_title"
  | "twitter_description"
  | "tags"
  | "published_at"
  | "updated_at"
>;

const COLUMNS =
  "slug,title,excerpt,blocks,content_html,seo_title,seo_description,og_title,og_description,twitter_title,twitter_description,tags,published_at,updated_at";

/** Escape for an XML text node. No CDATA: a body containing `]]>` would break it. */
function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** RFC 822 date, which is what RSS 2.0 requires. */
function rfc822(value: string): string {
  return new Date(value).toUTCString();
}

function item(row: FeedRow): string {
  const seo = resolveArticleSeo({
    ...row,
    canonical_url: null,
    og_image: null,
    cover_image: null,
    robots_index: "index",
    robots_follow: "follow",
  });
  const url = postUrl(row.slug);
  const body = sanitizeArticleHtml(resolveBodyHtml(row));

  const parts = [
    "    <item>",
    `      <title>${xml(seo.title)}</title>`,
    `      <link>${xml(url)}</link>`,
    `      <guid isPermaLink="true">${xml(url)}</guid>`,
  ];

  if (seo.description) {
    parts.push(`      <description>${xml(seo.description)}</description>`);
  }
  // Absent rather than invented when an article somehow has no publish stamp.
  if (row.published_at) {
    parts.push(`      <pubDate>${rfc822(row.published_at)}</pubDate>`);
  }
  for (const tag of row.tags ?? []) {
    parts.push(`      <category>${xml(tag)}</category>`);
  }
  if (body) {
    parts.push(`      <content:encoded>${xml(body)}</content:encoded>`);
  }

  parts.push("    </item>");
  return parts.join("\n");
}

export async function GET() {
  let rows: FeedRow[] = [];

  if (supabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("posts")
      .select(COLUMNS)
      .eq("published", true)
      .neq("robots_index", "noindex")
      .order("published_at", { ascending: false });
    rows = (data ?? []) as FeedRow[];
  }

  const feedUrl = `${SITE.url}/feed.xml`;
  const newest = rows
    .map((row) => row.updated_at)
    .filter(Boolean)
    .sort()
    .at(-1);

  const head = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">',
    "  <channel>",
    `    <title>${xml(`${SITE.blog.title} — ${SITE.name}`)}</title>`,
    `    <link>${xml(`${SITE.url}${SITE.blog.base}`)}</link>`,
    `    <description>${xml(SITE.blog.description)}</description>`,
    `    <language>${SITE.lang}</language>`,
    `    <atom:link href="${xml(feedUrl)}" rel="self" type="application/rss+xml" />`,
  ];
  if (newest) head.push(`    <lastBuildDate>${rfc822(newest)}</lastBuildDate>`);

  const body = [...head, ...rows.map(item), "  </channel>", "</rss>", ""].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
