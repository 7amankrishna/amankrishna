import type { Metadata } from "next";
import { resolveBodyHtml } from "@/lib/content/blocks-to-html";
import type { Post } from "@/lib/posts";
import { resolveSeo, type ResolvedSeo } from "@/lib/seo/fields";
import { SITE, absoluteUrl, postUrl } from "@/lib/site";

/**
 * The bridge between what the author typed and what Next actually emits.
 *
 * Everything here goes through `resolveSeo()` — the same function the editor's
 * preview panes call. That is the entire point of this module: a preview that
 * computes its own fallbacks eventually disagrees with the shipped tag, and a
 * preview that lies is worse than no preview at all.
 *
 * Two deliberate choices worth knowing before you edit:
 *
 *   - `title` is emitted as `{ absolute }`, bypassing the root layout's
 *     `%s — Aman Krishna` template. The editor previews the resolved title on
 *     its own, so appending a suffix here would put a different string in
 *     `<title>` than the author was shown.
 *   - `openGraph.images` is *omitted* when the article has no share image, so
 *     Next's file convention can fall back to `blog/[slug]/opengraph-image`.
 *     Setting it to `[]` would suppress that fallback.
 */

/** The columns metadata generation reads. Narrow on purpose. */
export type ArticleSeoInput = Pick<
  Post,
  | "slug"
  | "title"
  | "excerpt"
  | "blocks"
  | "content_html"
  | "seo_title"
  | "seo_description"
  | "canonical_url"
  | "og_title"
  | "og_description"
  | "og_image"
  | "twitter_title"
  | "twitter_description"
  | "cover_image"
  | "tags"
  | "robots_index"
  | "robots_follow"
  | "published_at"
  | "updated_at"
>;

/** Resolve every title/description slot exactly as the editor preview does. */
export function resolveArticleSeo(post: ArticleSeoInput): ResolvedSeo {
  return resolveSeo({
    title: post.title,
    seoTitle: post.seo_title,
    seoDescription: post.seo_description,
    excerpt: post.excerpt,
    ogTitle: post.og_title,
    ogDescription: post.og_description,
    twitterTitle: post.twitter_title,
    twitterDescription: post.twitter_description,
    bodyHtml: resolveBodyHtml(post),
  });
}

/**
 * The article's canonical URL.
 *
 * An author-supplied `canonical_url` wins — that field exists so a
 * cross-posted article can point at the original. It is validated with
 * `isSafeUrl` at save time; `absoluteUrl` here only normalises a site-relative
 * value. Otherwise the permalink is built from `SITE.url`, which never reads
 * `VERCEL_URL`, so a preview deployment cannot leak into a canonical tag.
 */
export function articleCanonical(post: Pick<ArticleSeoInput, "slug" | "canonical_url">): string {
  const explicit = post.canonical_url?.trim();
  return explicit ? absoluteUrl(explicit) : postUrl(post.slug);
}

/**
 * Share image, or null to let the generated per-article card take over.
 * `og_image` is the field authors set for this; `cover_image` is reused when
 * they have not, because a card with the article's own art beats a generic one.
 */
export function articleShareImage(
  post: Pick<ArticleSeoInput, "og_image" | "cover_image">,
): string | null {
  const raw = post.og_image?.trim() || post.cover_image?.trim() || "";
  return raw ? absoluteUrl(raw) : null;
}

/** Full `Metadata` for one article. */
export function articleMetadata(post: ArticleSeoInput): Metadata {
  const seo = resolveArticleSeo(post);
  const canonical = articleCanonical(post);
  const image = articleShareImage(post);
  const tags = post.tags?.length ? [...post.tags] : undefined;

  // Stored per article and, until now, ignored. `noindex` still ships the page;
  // it only asks search engines not to list it.
  const index = post.robots_index !== "noindex";
  const follow = post.robots_follow !== "nofollow";

  return {
    title: { absolute: seo.title },
    description: seo.description || undefined,
    keywords: tags,
    authors: [{ name: SITE.author.name, url: SITE.url }],
    alternates: { canonical },
    robots: {
      index,
      follow,
      googleBot: { index, follow },
    },
    openGraph: {
      type: "article",
      url: canonical,
      siteName: SITE.name,
      locale: SITE.locale,
      title: seo.ogTitle,
      description: seo.ogDescription || undefined,
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at ?? undefined,
      authors: [SITE.author.name],
      tags,
      ...(image ? { images: [{ url: image, alt: seo.ogTitle }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: seo.twitterTitle,
      description: seo.twitterDescription || undefined,
      ...(image ? { images: [image] } : {}),
    },
  };
}
