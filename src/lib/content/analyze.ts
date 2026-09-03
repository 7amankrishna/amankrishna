import { SITE } from "@/lib/site";
import { statsFromHtml, type ArticleStats } from "@/lib/content/stats";

/**
 * Content analysis for the editor's SEO checklist and for the save action.
 *
 * Isomorphic and regex-based rather than DOM-based, so the same numbers appear
 * live in the editor (browser) and when persisting (server). The input is
 * always TipTap-generated, already-sanitized HTML — not arbitrary web HTML —
 * which is why lightweight matching is sufficient here.
 */

export type HeadingInfo = { level: number; text: string; id: string };

export type ContentFacts = {
  stats: ArticleStats;
  headings: HeadingInfo[];
  h1Count: number;
  h2Count: number;
  h3Count: number;
  imageCount: number;
  /** Images whose alt attribute is missing or whitespace-only. */
  imagesMissingAlt: number;
  internalLinks: number;
  externalLinks: number;
  /** CSS families referenced by inline `font-family` declarations. */
  fonts: string[];
};

const TAG_RE = /<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi;
const IMG_RE = /<img\b[^>]*>/gi;
const A_RE = /<a\b[^>]*>/gi;
const ATTR_RE = (name: string) =>
  new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i");
const FONT_FAMILY_RE = /font-family\s*:\s*([^;"']+)/gi;

function textOf(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(ATTR_RE(name));
  if (!m) return null;
  return m[2] ?? m[3] ?? "";
}

/** Stable, readable anchor id for a heading — used for deep links and TOC. */
export function headingId(text: string, index: number): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return base || `section-${index + 1}`;
}

export function analyzeContent(html: string | null | undefined): ContentFacts {
  const source = html ?? "";

  const headings: HeadingInfo[] = [];
  for (const m of source.matchAll(TAG_RE)) {
    const text = textOf(m[2]);
    if (!text) continue;
    headings.push({
      level: Number(m[1][1]),
      text,
      id: headingId(text, headings.length),
    });
  }

  let imageCount = 0;
  let imagesMissingAlt = 0;
  for (const m of source.matchAll(IMG_RE)) {
    imageCount++;
    if (!attr(m[0], "alt")?.trim()) imagesMissingAlt++;
  }

  let internalLinks = 0;
  let externalLinks = 0;
  for (const m of source.matchAll(A_RE)) {
    const href = attr(m[0], "href")?.trim();
    if (!href) continue;
    const isAbsolute = /^https?:\/\//i.test(href) || href.startsWith("//");
    if (!isAbsolute) internalLinks++;
    else if (href.includes(SITE.host)) internalLinks++;
    else externalLinks++;
  }

  const fonts = new Set<string>();
  for (const m of source.matchAll(FONT_FAMILY_RE)) {
    // "Inter, sans-serif" → "Inter": the first entry is the chosen family.
    const first = m[1].split(",")[0].trim().replace(/^["']|["']$/g, "");
    if (first) fonts.add(first);
  }

  return {
    stats: statsFromHtml(source),
    headings,
    h1Count: headings.filter((h) => h.level === 1).length,
    h2Count: headings.filter((h) => h.level === 2).length,
    h3Count: headings.filter((h) => h.level === 3).length,
    imageCount,
    imagesMissingAlt,
    internalLinks,
    externalLinks,
    fonts: [...fonts].sort(),
  };
}

/** Just the font families, for the `posts.fonts` column. */
export function extractFonts(html: string | null | undefined): string[] {
  return analyzeContent(html).fonts;
}

// ------------------------------------------------------------------
// SEO checklist
// ------------------------------------------------------------------

export type CheckStatus = "pass" | "warn" | "info";

export type SeoCheck = {
  id: string;
  status: CheckStatus;
  label: string;
  /** Shown when the check is not passing — always actionable, never a score. */
  hint?: string;
};

export type SeoInput = {
  title: string;
  slug: string;
  slugError: string | null;
  seoTitle: string;
  seoDescription: string;
  excerpt: string;
  canonicalUrl: string;
  ogImage: string;
  coverImage: string;
  tags: string[];
  robotsIndex: "index" | "noindex";
};

/** Recommended pixel-ish character budgets Google typically renders. */
export const LIMITS = {
  seoTitle: { ideal: 60, max: 70 },
  seoDescription: { ideal: 155, max: 170 },
} as const;

/**
 * Build the checklist. Everything is a `pass`/`warn`/`info` signal with a
 * concrete next step — deliberately no numeric "SEO score", which would be
 * invented precision.
 */
export function runSeoChecks(
  input: SeoInput,
  facts: ContentFacts,
): SeoCheck[] {
  const checks: SeoCheck[] = [];
  const effectiveTitle = input.seoTitle.trim() || input.title.trim();
  const effectiveDescription =
    input.seoDescription.trim() || input.excerpt.trim();

  checks.push(
    effectiveTitle
      ? effectiveTitle.length > LIMITS.seoTitle.max
        ? {
            id: "seo-title",
            status: "warn",
            label: "SEO title exists",
            hint: `${effectiveTitle.length} characters — Google usually truncates past ~${LIMITS.seoTitle.ideal}.`,
          }
        : { id: "seo-title", status: "pass", label: "SEO title exists" }
      : {
          id: "seo-title",
          status: "warn",
          label: "SEO title exists",
          hint: "Add an SEO title, or it falls back to the article title.",
        },
  );

  checks.push(
    effectiveDescription
      ? effectiveDescription.length > LIMITS.seoDescription.max
        ? {
            id: "meta-description",
            status: "warn",
            label: "Meta description exists",
            hint: `${effectiveDescription.length} characters — aim for ~${LIMITS.seoDescription.ideal}.`,
          }
        : effectiveDescription.length < 50
          ? {
              id: "meta-description",
              status: "warn",
              label: "Meta description exists",
              hint: "Under 50 characters is usually too thin to earn a click.",
            }
          : { id: "meta-description", status: "pass", label: "Meta description exists" }
      : {
          id: "meta-description",
          status: "warn",
          label: "Meta description exists",
          hint: "Write 1–2 sentences describing the article.",
        },
  );

  checks.push(
    input.slugError
      ? {
          id: "slug",
          status: "warn",
          label: "URL slug is valid",
          hint: input.slugError,
        }
      : { id: "slug", status: "pass", label: "URL slug is valid" },
  );

  checks.push(
    input.title.trim()
      ? {
          id: "h1",
          status: "pass",
          label: "Article has one primary H1 (the title)",
        }
      : {
          id: "h1",
          status: "warn",
          label: "Article has one primary H1 (the title)",
          hint: "The article title is rendered as the page's H1 — add one.",
        },
  );

  checks.push(
    facts.h1Count > 0
      ? {
          id: "extra-h1",
          status: "warn",
          label: "Body avoids extra H1 headings",
          hint: `${facts.h1Count} H1 in the body competes with the title. Use H2 instead.`,
        }
      : { id: "extra-h1", status: "pass", label: "Body avoids extra H1 headings" },
  );

  checks.push(
    facts.h2Count + facts.h3Count > 0
      ? { id: "structure", status: "pass", label: "Content uses H2/H3 structure" }
      : {
          id: "structure",
          status: facts.stats.words > 300 ? "warn" : "info",
          label: "Content uses H2/H3 structure",
          hint: "Break the article into sections with H2 (and H3) headings.",
        },
  );

  checks.push(
    facts.imageCount === 0
      ? { id: "alt", status: "info", label: "Images have alt text", hint: "No images in this article." }
      : facts.imagesMissingAlt > 0
        ? {
            id: "alt",
            status: "warn",
            label: "Images have alt text",
            hint: `${facts.imagesMissingAlt} of ${facts.imageCount} image${facts.imageCount === 1 ? "" : "s"} missing alt text.`,
          }
        : { id: "alt", status: "pass", label: "Images have alt text" },
  );

  checks.push(
    input.canonicalUrl.trim()
      ? { id: "canonical", status: "pass", label: "Canonical URL configured (custom)" }
      : {
          id: "canonical",
          status: "pass",
          label: "Canonical URL configured (auto)",
          hint: `Defaults to ${SITE.url}${SITE.blog.base}/${input.slug || "slug"}.`,
        },
  );

  const socialImage = input.ogImage.trim() || input.coverImage.trim();
  checks.push(
    socialImage
      ? { id: "og-image", status: "pass", label: "Open Graph image available (custom)" }
      : {
          id: "og-image",
          status: "pass",
          label: "Open Graph image available (generated)",
          hint: "No custom image — a branded 1200×630 card is generated automatically.",
        },
  );

  checks.push(
    facts.stats.words >= 300
      ? { id: "length", status: "pass", label: "Article has enough content to be useful" }
      : {
          id: "length",
          status: "warn",
          label: "Article has enough content to be useful",
          hint: `${facts.stats.words} words. Short posts rarely satisfy a search intent.`,
        },
  );

  checks.push(
    facts.internalLinks + facts.externalLinks > 0
      ? {
          id: "links",
          status: "pass",
          label: "Internal/external links detected",
          hint: `${facts.internalLinks} internal, ${facts.externalLinks} external.`,
        }
      : {
          id: "links",
          status: "warn",
          label: "Internal/external links detected",
          hint: "Link to a related article or a source to give readers a next step.",
        },
  );

  checks.push(
    input.robotsIndex === "index"
      ? { id: "indexable", status: "pass", label: "Page is indexable" }
      : {
          id: "indexable",
          status: "warn",
          label: "Page is indexable",
          hint: "Set to noindex — this article will be excluded from search and the sitemap.",
        },
  );

  return checks;
}
