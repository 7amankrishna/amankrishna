import { ImageResponse } from "next/og";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { SITE } from "@/lib/site";

/**
 * Per-article share card — the fallback when an author has set neither
 * `og_image` nor `cover_image`.
 *
 * `articleMetadata` deliberately omits `openGraph.images` in that case so this
 * file convention takes over. When the author *has* set an image, the explicit
 * one wins and this route is simply never referenced.
 *
 * Rendered on the Node runtime (the default). Nothing here needs the edge, and
 * Node keeps `cookies()` — which the Supabase server client uses — working the
 * same way it does everywhere else in the app.
 */

export const alt = `Article on ${SITE.name}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function getTitle(slug: string): Promise<string | null> {
  if (!supabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("title, seo_title")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  const row = data as { title?: string; seo_title?: string | null } | null;
  // Same precedence as the `<title>`: the SEO title wins when it exists.
  return row?.seo_title?.trim() || row?.title?.trim() || null;
}

export default async function ArticleOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const title = await getTitle(slug);

  // A long headline gets a smaller face rather than an overflowing one. Satori
  // has no `text-overflow`, so the size is chosen up front.
  const headline = title ?? SITE.blog.description;
  const fontSize = headline.length > 90 ? 52 : headline.length > 55 ? 64 : 76;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#050505",
          backgroundImage:
            "radial-gradient(circle at 15% 15%, rgba(124,92,255,0.28), transparent 55%), radial-gradient(circle at 85% 80%, rgba(34,211,238,0.22), transparent 55%)",
          color: "#f5f5f7",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 26,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#8f8f98",
          }}
        >
          {SITE.blog.title}
        </div>

        <div
          style={{
            display: "flex",
            fontSize,
            fontWeight: 700,
            lineHeight: 1.12,
            letterSpacing: "-0.035em",
            maxWidth: 1000,
          }}
        >
          {headline}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              width: 44,
              height: 4,
              background: "linear-gradient(90deg, #7c5cff, #22d3ee)",
            }}
          />
          <div style={{ display: "flex", fontSize: 30, color: "#f5f5f7" }}>
            {SITE.name}
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#8f8f98" }}>
            {SITE.author.name}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
