import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, Clock } from "lucide-react";

import { ArticleBody } from "@/components/blog/article-body";
import { BlockRenderer } from "@/components/blog/block-renderer";
import { ArticleFonts } from "@/components/fonts/article-fonts";
import { StructuredData } from "@/components/seo/structured-data";
import { Github, Linkedin } from "@/components/ui/brand-icons";
import { resolveBodyHtml } from "@/lib/content/blocks-to-html";
import { statsFromHtml } from "@/lib/content/stats";
import { getFontsForFamilies } from "@/lib/fonts/query";
import type { Post, PostSummary } from "@/lib/posts";
import {
  blogPostingJsonLd,
  breadcrumbJsonLd,
  graph,
  personJsonLd,
  websiteJsonLd,
  type BreadcrumbStep,
} from "@/lib/seo/jsonld";
import {
  articleCanonical,
  articleMetadata,
  articleShareImage,
  resolveArticleSeo,
} from "@/lib/seo/metadata";
import { SITE, postUrl } from "@/lib/site";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

export const revalidate = 300;

type Params = Promise<{ slug: string }>;

/** Matches `PostSummary` — enough for a card, prev/next and related links. */
const SUMMARY_COLUMNS =
  "id,slug,title,excerpt,cover_image,og_image,tags,published_at,updated_at";

/** One published article, or null. Drafts are unreachable here and via RLS. */
async function getPost(slug: string): Promise<Post | null> {
  if (!supabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  return (data as Post) ?? null;
}

/**
 * Where a retired slug now points.
 *
 * `savePost` has been writing `post_slug_history` rows on every rename of a
 * published article, but nothing read them — so renaming an indexed article
 * turned a working URL into a 404. This closes that loop.
 *
 * The target is re-checked for `published` because an article can be renamed
 * and later unpublished; redirecting to a 404 is worse than serving one.
 */
async function redirectTarget(slug: string): Promise<string | null> {
  if (!supabaseConfigured()) return null;
  const supabase = await createClient();

  const { data } = await supabase
    .from("post_slug_history")
    .select("post_id")
    .eq("slug", slug)
    .maybeSingle();

  const postId = (data as { post_id?: string } | null)?.post_id;
  if (!postId) return null;

  const { data: target } = await supabase
    .from("posts")
    .select("slug")
    .eq("id", postId)
    .eq("published", true)
    .maybeSingle();

  const nextSlug = (target as { slug?: string } | null)?.slug;
  return nextSlug && nextSlug !== slug ? nextSlug : null;
}

/** Published articles, newest first. Feeds prev/next and related links. */
async function getPublishedIndex(): Promise<PostSummary[]> {
  if (!supabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select(SUMMARY_COLUMNS)
    .eq("published", true)
    .order("published_at", { ascending: false });
  return (data ?? []) as PostSummary[];
}

/**
 * Per-article `<head>`.
 *
 * Every field is resolved by `articleMetadata`, which shares `resolveSeo()` with
 * the editor's preview panes — so the Google card an author reviewed and the tag
 * that ships are computed by the same code.
 *
 * A slug that only exists in the history table returns nothing useful: the page
 * component redirects, so this response is never rendered.
 */
export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) {
    return { title: "Article not found", robots: { index: false, follow: true } };
  }
  return articleMetadata(post);
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Up to three other published articles that share a tag with this one. */
function relatedPosts(index: PostSummary[], post: Post): PostSummary[] {
  const tags = new Set((post.tags ?? []).map((tag) => tag.toLowerCase()));
  if (!tags.size) return [];

  return index
    .filter(
      (candidate) =>
        candidate.slug !== post.slug &&
        (candidate.tags ?? []).some((tag) => tags.has(tag.toLowerCase())),
    )
    .slice(0, 3);
}

export default async function ArticlePage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    // The slug may be a retired one. `permanentRedirect` emits a 308, which
    // search engines treat exactly as they treat a 301 — permanent, and the
    // signal transfers to the new URL.
    const moved = await redirectTarget(slug);
    if (moved) permanentRedirect(`${SITE.blog.base}/${moved}`);
    notFound();
  }

  const [index, fontLibrary] = await Promise.all([
    getPublishedIndex(),
    getFontsForFamilies(post.fonts ?? []),
  ]);

  const bodyHtml = resolveBodyHtml(post);
  /**
   * Legacy articles keep their original renderer.
   *
   * `ArticleBody` would render them too — `resolveBodyHtml` converts blocks to
   * HTML — but `BlockRenderer` is what they have always been drawn with, and
   * "existing posts keep working" means keeping them *identical*, not merely
   * non-empty. The moment such an article is opened and saved in the rich-text
   * editor it gains `content_html` and moves to the prose renderer.
   */
  const legacyBlocksOnly =
    !post.content_html?.trim() && Boolean(post.blocks?.length);

  const stats = statsFromHtml(bodyHtml);
  const seo = resolveArticleSeo(post);
  const canonical = articleCanonical(post);
  const published = formatDate(post.published_at);
  const tags = post.tags ?? [];
  const related = relatedPosts(index, post);

  // Newest-first ordering, so the entry *before* this one is the newer article.
  const position = index.findIndex((entry) => entry.slug === post.slug);
  const newer = position > 0 ? index[position - 1] : null;
  const older =
    position >= 0 && position < index.length - 1 ? index[position + 1] : null;

  const trail: BreadcrumbStep[] = [
    { name: "Home", url: SITE.url },
    { name: SITE.blog.title, url: `${SITE.url}${SITE.blog.base}` },
    { name: post.title, url: postUrl(post.slug) },
  ];

  return (
    <>
      {/* Only the families this article's own markup references. */}
      <ArticleFonts families={post.fonts ?? []} library={fontLibrary} />
      <StructuredData
        id="article-jsonld"
        data={graph(
          websiteJsonLd(),
          personJsonLd(),
          blogPostingJsonLd({
            slug: post.slug,
            headline: seo.title,
            description: seo.description,
            canonical,
            image: articleShareImage(post),
            datePublished: post.published_at,
            dateModified: post.updated_at,
            tags,
            bodyHtml,
          }),
          breadcrumbJsonLd(trail),
        )}
      />

      <main className="mx-auto max-w-3xl px-6 py-24">
        {/* Visible trail matching the BreadcrumbList above — Google expects
            the markup and the page to agree. */}
        <nav aria-label="Breadcrumb" className="mb-10">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-muted">
            <li>
              <Link href="/" className="transition-colors hover:text-fg">
                Home
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link href={SITE.blog.base} className="transition-colors hover:text-fg">
                {SITE.blog.title}
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="max-w-full truncate text-fg">
              {post.title}
            </li>
          </ol>
        </nav>

        <article>
          <header className="mb-10">
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs text-muted">
              {published && (
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="size-3.5" aria-hidden />
                  <time dateTime={post.published_at ?? undefined}>{published}</time>
                </span>
              )}
              {stats.readingLabel && (
                <span className="inline-flex items-center gap-2">
                  <Clock className="size-3.5" aria-hidden />
                  {stats.readingLabel}
                </span>
              )}
            </div>

            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              {post.title}
            </h1>

            {post.excerpt && (
              <p className="mt-4 text-lg leading-relaxed text-muted">{post.excerpt}</p>
            )}

            {tags.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <li key={tag}>
                    <Link
                      href={`${SITE.blog.base}?tag=${encodeURIComponent(tag)}`}
                      className="inline-flex rounded-full border border-line px-3 py-1 text-xs text-muted transition-colors hover:border-violet hover:text-fg"
                    >
                      {tag}
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {post.cover_image && (
              // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote URLs
              <img
                src={post.cover_image}
                alt=""
                className="mt-8 w-full rounded-2xl border border-line"
              />
            )}
          </header>

          {legacyBlocksOnly ? (
            <BlockRenderer blocks={post.blocks ?? []} />
          ) : (
            <ArticleBody post={post} />
          )}
        </article>

        {/* ---- author ------------------------------------------------------ */}
        <aside className="glass mt-16 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow mb-1">Written by</p>
            <p className="text-lg font-medium">{SITE.author.name}</p>
            <p className="text-sm text-muted">{SITE.author.role}</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={SITE.author.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${SITE.author.name} on LinkedIn`}
              className="inline-flex size-10 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-violet hover:text-fg"
            >
              <Linkedin className="size-4" />
            </a>
            <a
              href={SITE.author.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${SITE.author.name} on GitHub`}
              className="inline-flex size-10 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-cyan hover:text-fg"
            >
              <Github className="size-4" />
            </a>
            <Link
              href="/#contact"
              className="rounded-full border border-line px-4 py-2 text-sm text-muted transition-colors hover:border-cyan hover:text-fg"
            >
              Get in touch
            </Link>
          </div>
        </aside>

        {/* ---- related ----------------------------------------------------- */}
        {related.length > 0 && (
          <section className="mt-16" aria-labelledby="related-heading">
            <h2 id="related-heading" className="eyebrow mb-4">
              Related reading
            </h2>
            <ul className="space-y-3">
              {related.map((entry) => (
                <li key={entry.slug}>
                  <Link
                    href={`${SITE.blog.base}/${entry.slug}`}
                    className="g-border block p-5 transition-transform hover:-translate-y-0.5"
                  >
                    <p className="font-medium">{entry.title}</p>
                    {entry.excerpt && (
                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">
                        {entry.excerpt}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ---- prev / next -------------------------------------------------- */}
        <nav
          aria-label="More articles"
          className="mt-16 grid gap-3 border-t border-line pt-8 sm:grid-cols-2"
        >
          {older ? (
            <Link
              href={`${SITE.blog.base}/${older.slug}`}
              rel="prev"
              className="g-border group p-5"
            >
              <span className="mb-1 inline-flex items-center gap-2 font-mono text-xs text-muted">
                <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
                Older
              </span>
              <span className="block font-medium">{older.title}</span>
            </Link>
          ) : (
            <span aria-hidden />
          )}

          {newer && (
            <Link
              href={`${SITE.blog.base}/${newer.slug}`}
              rel="next"
              className="g-border group p-5 sm:text-right"
            >
              <span className="mb-1 inline-flex items-center gap-2 font-mono text-xs text-muted">
                Newer
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
              <span className="block font-medium">{newer.title}</span>
            </Link>
          )}
        </nav>

        <p className="mt-10 text-sm">
          <Link
            href={SITE.blog.base}
            className="inline-flex items-center gap-2 text-muted transition-colors hover:text-fg"
          >
            <ArrowLeft className="size-4" aria-hidden /> All articles
          </Link>
        </p>
      </main>
    </>
  );
}
