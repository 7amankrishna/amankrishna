import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, CalendarDays } from "lucide-react";

import { StructuredData } from "@/components/seo/structured-data";
import type { PostSummary } from "@/lib/posts";
import {
  blogJsonLd,
  breadcrumbJsonLd,
  graph,
  personJsonLd,
  websiteJsonLd,
  type BreadcrumbStep,
} from "@/lib/seo/jsonld";
import { SITE } from "@/lib/site";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

/**
 * Public blog index. Published articles only — RLS enforces that too.
 *
 * `?tag=` filters the list. Two decisions behind it:
 *
 *   - **The canonical always points at bare `/blog`.** A filtered view is a facet
 *     of one page, not a page of its own; letting `/blog?tag=ai` be indexed
 *     separately would put near-duplicate listings in competition with each other.
 *   - **`noindex` articles still appear here.** The flag means "do not index this
 *     page", not "unlist it" — the index is human navigation, and the article
 *     carries its own robots tag. The sitemap and the feed do exclude them,
 *     because those are machine distribution.
 *
 * Filtering happens in memory rather than in SQL so the tag bar can be built from
 * the same rows, and so a hand-typed `?tag=ai` matches a stored `AI`.
 */

export const revalidate = 300;

/** Matches `PostSummary` — a card needs no body, so none is fetched. */
const SUMMARY_COLUMNS =
  "id,slug,title,excerpt,cover_image,og_image,tags,published_at,updated_at";

type SearchParams = Promise<{ tag?: string | string[] }>;

/** First `?tag=` value. A repeated param collapses to the first one. */
function readTag(params: { tag?: string | string[] }): string {
  const raw = Array.isArray(params.tag) ? params.tag[0] : params.tag;
  return (raw ?? "").trim();
}

async function getPosts(): Promise<PostSummary[]> {
  if (!supabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select(SUMMARY_COLUMNS)
    .eq("published", true)
    .order("published_at", { ascending: false });
  return (data ?? []) as PostSummary[];
}

const FEED_ALTERNATES = {
  types: {
    "application/rss+xml": [
      { url: "/feed.xml", title: `${SITE.blog.title} — ${SITE.name}` },
    ],
  },
};

/**
 * Setting `alternates` replaces the root layout's copy wholesale, so the feed
 * link has to be repeated here or it would vanish from this page's `<head>`.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const tag = readTag(await searchParams);
  const title = tag ? `Posts tagged “${tag}”` : SITE.blog.title;
  const url = `${SITE.url}${SITE.blog.base}`;

  return {
    title,
    description: SITE.blog.description,
    alternates: { canonical: SITE.blog.base, ...FEED_ALTERNATES },
    openGraph: {
      type: "website",
      url,
      title,
      description: SITE.blog.description,
      siteName: SITE.name,
      locale: SITE.locale,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: SITE.blog.description,
    },
  };
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Tag-bar pill. Same shape as the chips on an article, plus an active state. */
function chip(isActive: boolean): string {
  return cn(
    "inline-flex rounded-full border px-3 py-1 text-xs transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet",
    isActive
      ? "border-violet text-fg"
      : "border-line text-muted hover:border-violet hover:text-fg",
  );
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const requested = readTag(await searchParams);
  const posts = await getPosts();

  // Every tag in use, first-seen order — so the newest article's tags lead.
  const tags: string[] = [];
  const seen = new Set<string>();
  for (const post of posts) {
    for (const tag of post.tags ?? []) {
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      tags.push(tag);
    }
  }

  // An unknown tag stays active on purpose: the empty state can then name it,
  // which is more useful than silently showing every article.
  const active = requested
    ? (tags.find((tag) => tag.toLowerCase() === requested.toLowerCase()) ??
      requested)
    : "";
  const visible = active
    ? posts.filter((post) =>
        (post.tags ?? []).some((tag) => tag.toLowerCase() === active.toLowerCase()),
      )
    : posts;

  const trail: BreadcrumbStep[] = [
    { name: "Home", url: SITE.url },
    { name: SITE.blog.title, url: `${SITE.url}${SITE.blog.base}` },
  ];

  return (
    <>
      <StructuredData
        id="blog-jsonld"
        data={graph(
          websiteJsonLd(),
          personJsonLd(),
          blogJsonLd(),
          breadcrumbJsonLd(trail),
        )}
      />

      <main className="mx-auto max-w-3xl px-6 py-24">
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-4" /> Home
        </Link>

        <p className="eyebrow mb-3">Writing</p>
        <h1 className="mb-6 text-4xl font-semibold tracking-tight">
          {SITE.blog.title}
        </h1>

        {tags.length > 0 && (
          // Links rather than buttons: each filter is a real, shareable URL, so
          // `aria-current` is the right state — `aria-pressed` belongs to toggles.
          <nav aria-label="Filter articles by tag" className="mb-12">
            <ul className="flex flex-wrap gap-2">
              <li>
                <Link
                  href={SITE.blog.base}
                  aria-current={active ? undefined : "page"}
                  className={chip(!active)}
                >
                  All
                </Link>
              </li>
              {tags.map((tag) => {
                const isActive = tag.toLowerCase() === active.toLowerCase();
                return (
                  <li key={tag}>
                    <Link
                      href={`${SITE.blog.base}?tag=${encodeURIComponent(tag)}`}
                      aria-current={isActive ? "page" : undefined}
                      className={chip(isActive)}
                    >
                      {tag}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        {visible.length === 0 ? (
          <p className="glass border-dashed p-10 text-center text-sm text-muted">
            {active
              ? `No articles tagged “${active}” yet.`
              : "Nothing published yet — first article coming soon."}
          </p>
        ) : (
          <ul className="space-y-4">
            {visible.map((post) => {
              const published = formatDate(post.published_at);
              return (
                <li key={post.slug}>
                  <Link
                    href={`${SITE.blog.base}/${post.slug}`}
                    className="g-border group block p-6 transition-transform hover:-translate-y-0.5"
                  >
                    {published && (
                      <div className="mb-2 flex items-center gap-2 font-mono text-xs text-muted">
                        <CalendarDays className="size-3.5" aria-hidden />
                        <time dateTime={post.published_at ?? undefined}>
                          {published}
                        </time>
                      </div>
                    )}
                    <h2 className="mb-1 flex items-center gap-2 text-xl font-medium">
                      {post.title}
                      <ArrowUpRight
                        className="size-4 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cyan"
                        aria-hidden
                      />
                    </h2>
                    {post.excerpt && (
                      <p className="line-clamp-2 text-sm leading-relaxed text-muted">
                        {post.excerpt}
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
