import { statsFromHtml } from "@/lib/content/stats";
import { AUTHOR_SAME_AS, SITE, postUrl } from "@/lib/site";

/**
 * Structured data, built only from values that actually exist.
 *
 * Rules this module is written to, because a validator is very easy to satisfy
 * dishonestly:
 *
 *   - **No invented fields.** A missing `datePublished` is omitted, never
 *     back-filled with "now". An article with no share image gets no `image`
 *     property rather than a generic site card dressed up as the article's own.
 *   - **`sameAs` comes from `AUTHOR_SAME_AS`** (LinkedIn + GitHub, both
 *     verified). No profile is invented to pad the list.
 *   - **Every URL comes from `SITE.url`**, which never reads `VERCEL_URL`, so a
 *     preview deployment cannot end up inside a published graph.
 *
 * Nodes are linked by `@id` rather than repeated inline, so the Person that
 * authors an article is the same entity as the one that publishes the site.
 */

/** A JSON-LD node. `unknown` values keep this honest without reaching for `any`. */
export type JsonLd = Record<string, unknown>;

const WEBSITE_ID = `${SITE.url}/#website`;
const PERSON_ID = `${SITE.url}/#person`;
const BLOG_ID = `${SITE.url}${SITE.blog.base}/#blog`;

/** The author, as an entity other nodes can point at. */
export function personJsonLd(): JsonLd {
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: SITE.author.name,
    url: SITE.url,
    jobTitle: SITE.author.jobTitle,
    description: SITE.author.role,
    sameAs: [...AUTHOR_SAME_AS],
  };
}

/** The site itself. Published and authored by the same Person. */
export function websiteJsonLd(): JsonLd {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE.url,
    name: SITE.name,
    description: SITE.description,
    inLanguage: SITE.lang,
    publisher: { "@id": PERSON_ID },
    author: { "@id": PERSON_ID },
  };
}

/** The blog as a collection, for the `/blog` index. */
export function blogJsonLd(): JsonLd {
  return {
    "@type": "Blog",
    "@id": BLOG_ID,
    url: `${SITE.url}${SITE.blog.base}`,
    name: `${SITE.blog.title} — ${SITE.name}`,
    description: SITE.blog.description,
    inLanguage: SITE.lang,
    isPartOf: { "@id": WEBSITE_ID },
    publisher: { "@id": PERSON_ID },
    author: { "@id": PERSON_ID },
  };
}

/** One rung of a breadcrumb trail. */
export type BreadcrumbStep = { name: string; url: string };

/**
 * `BreadcrumbList` for the trail rendered on the page.
 *
 * Google requires the visible breadcrumb and the markup to agree, so callers
 * pass the same array they render rather than rebuilding it here.
 */
export function breadcrumbJsonLd(trail: BreadcrumbStep[]): JsonLd {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((step, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: step.name,
      item: step.url,
    })),
  };
}

/** What `blogPostingJsonLd` needs. Resolved values, not raw columns. */
export type BlogPostingInput = {
  slug: string;
  /** Already resolved through `resolveSeo`, so it matches the `<title>`. */
  headline: string;
  description: string;
  /** Canonical URL — may point off-site for a cross-post. */
  canonical: string;
  /** Absolute share-image URL, or null when the article has none. */
  image: string | null;
  datePublished: string | null;
  dateModified: string | null;
  tags: string[];
  /** Sanitised body HTML, used for a real word count and reading time. */
  bodyHtml: string;
};

/**
 * `BlogPosting` for one article.
 *
 * `wordCount` and `timeRequired` are computed from the body with the same
 * function the editor footer uses, so the "8 min read" on the page and the one
 * in the markup can never diverge. Both are omitted for an empty body.
 *
 * `url` is the canonical, which is also what `mainEntityOfPage` points at. When
 * an author sets an off-site canonical they are declaring the original lives
 * elsewhere, and the markup should say the same thing the `<link>` does.
 */
export function blogPostingJsonLd(post: BlogPostingInput): JsonLd {
  const stats = statsFromHtml(post.bodyHtml);
  // The permalink is the fallback rather than an empty string: `@id` has to
  // resolve even if a caller passes a blank canonical.
  const canonical = post.canonical || postUrl(post.slug);

  const node: JsonLd = {
    "@type": "BlogPosting",
    "@id": `${canonical}#article`,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    url: canonical,
    headline: post.headline,
    isPartOf: { "@id": BLOG_ID },
    inLanguage: SITE.lang,
    author: { "@id": PERSON_ID },
    publisher: { "@id": PERSON_ID },
  };

  if (post.description) node.description = post.description;
  if (post.datePublished) node.datePublished = post.datePublished;
  if (post.dateModified) node.dateModified = post.dateModified;
  if (post.tags.length) node.keywords = [...post.tags];
  // Omitted rather than substituted: pointing at the site-wide card would
  // claim a generic image is this article's illustration.
  if (post.image) node.image = post.image;
  if (stats.words) {
    node.wordCount = stats.words;
    node.timeRequired = `PT${stats.readingMinutes}M`;
  }

  return node;
}

/**
 * Wrap nodes in a single `@graph` document.
 *
 * One script tag per page with every node in it, rather than several competing
 * documents, is what lets `@id` references resolve.
 */
export function graph(...nodes: JsonLd[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  };
}

/**
 * Serialize a JSON-LD document for embedding in a `<script>` element.
 *
 * This is a security control, not formatting. Article titles, descriptions and
 * tags are author-controlled, and inside a `<script>` the HTML parser is still
 * scanning for `</script`. `JSON.stringify` emits that sequence verbatim, which
 * would close the element early and drop the remainder of the document into the
 * page as markup. Escaping every `<` to its six-character unicode form is legal
 * JSON, parses to an identical value, and makes the breakout impossible.
 *
 * `>` and `&` are escaped too, so the string stays safe anywhere a parser treats
 * those specially.
 *
 * Lives here rather than in the component so it can be tested without a
 * renderer.
 */
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
