/**
 * Single source of truth for the canonical public identity of the site.
 *
 * Every canonical URL, Open Graph tag, sitemap entry, JSON-LD node and RSS
 * link is derived from `SITE.url`. That value is deliberately *not* inferred
 * from `VERCEL_URL` — search engines must only ever see the production domain,
 * never a `*.vercel.app` deployment host.
 *
 * Local dev and preview deployments keep working: they render the same absolute
 * URLs (which resolve to production), while relative navigation stays local.
 */

/** Strip a trailing slash so `${SITE.url}/blog` never doubles up. */
function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

/**
 * Canonical production origin. Override with NEXT_PUBLIC_SITE_URL only when
 * the site genuinely moves domains — not for previews.
 */
const CANONICAL_ORIGIN = normalizeOrigin(
  process.env.NEXT_PUBLIC_SITE_URL || "https://amankrishna.in",
);

export const SITE = {
  /** Human-facing site name, also used as og:site_name. */
  name: "AmanKrishna.in",
  /** Canonical origin, no trailing slash. */
  url: CANONICAL_ORIGIN,
  /** Bare host used in Google/social previews and breadcrumb labels. */
  host: CANONICAL_ORIGIN.replace(/^https?:\/\//, ""),
  locale: "en_US",
  lang: "en",
  description:
    "Aman Krishna writes about Artificial Intelligence, Machine Learning, software engineering and emerging technology.",
  tagline: "AI • Machine Learning • Full Stack Development • Problem Solver",
  author: {
    name: "Aman Krishna",
    /** Short role line used in the author card and Person JSON-LD. */
    role: "AI, Machine Learning & Technology Enthusiast",
    jobTitle: "B.Tech Computer Science Engineering Student",
    url: CANONICAL_ORIGIN,
    email: "7amankrishna@gmail.com",
    github: "https://github.com/7amankrishna",
    githubUser: "7amankrishna",
    linkedin: "https://www.linkedin.com/in/7amankrishna",
  },
  blog: {
    /** Path prefix for articles — used for permalinks and breadcrumbs. */
    base: "/blog",
    title: "Blog",
    description:
      "Articles on artificial intelligence, machine learning, and full-stack engineering.",
  },
  /** Words-per-minute used for the reading-time estimate. */
  readingWordsPerMinute: 225,
} as const;

/** Absolute URL for a site-relative path. Absolute inputs pass through. */
export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("//")) return `https:${path}`;
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Canonical permalink for an article slug. */
export function postUrl(slug: string): string {
  return `${SITE.url}${SITE.blog.base}/${slug}`;
}

/** Verified public profiles for `sameAs` — nothing invented. */
export const AUTHOR_SAME_AS: readonly string[] = [
  SITE.author.linkedin,
  SITE.author.github,
] as const;
