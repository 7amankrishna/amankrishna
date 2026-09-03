import { statsFromHtml } from "@/lib/content/stats";
import { SITE } from "@/lib/site";
import { SEO_LENGTHS, lengthNote } from "@/lib/seo/fields";
import { slugProblem } from "@/lib/posts";

/**
 * Pre-publish checks, as advice.
 *
 * Deliberately not a score. A number out of 100 invites optimising the number,
 * and any weighting behind it would be invented — nobody outside Google knows
 * what a title length is "worth". Each item here is a specific, checkable
 * statement about the draft, and every one of them can be ignored: nothing in
 * this module can prevent a save.
 *
 * Everything is derived from the actual draft. There is no item that cannot be
 * traced to a field the author filled in or a tag in the body they wrote.
 */

export type CheckStatus = "pass" | "warn" | "info";

export type Check = {
  id: string;
  status: CheckStatus;
  label: string;
  /** Why it matters, or what to do. Empty on a plain pass. */
  detail?: string;
};

export type ChecklistInput = {
  title: string;
  slug: string;
  /** Resolved through the fallback chain, i.e. what will actually ship. */
  resolvedTitle: string;
  resolvedDescription: string;
  /** True when the description came from a real `seo_description` field. */
  hasOwnDescription: boolean;
  excerpt: string;
  bodyHtml: string;
  canonicalUrl: string;
  hasImage: boolean;
  tagCount: number;
  noindex: boolean;
  nofollow: boolean;
};

/** Minimum body length before an article stops looking like a stub to a crawler. */
const THIN_CONTENT_WORDS = 300;

const IMG_TAG = /<img\b[^>]*>/gi;
const NON_EMPTY_ALT = /\balt\s*=\s*(?:"[^"]+"|'[^']+'|[^\s">]+)/i;

export function runChecklist(input: ChecklistInput): Check[] {
  const checks: Check[] = [];
  const stats = statsFromHtml(input.bodyHtml);

  /* ---- the two tags that are the search result ---------------------------- */

  const title = lengthNote(input.resolvedTitle, SEO_LENGTHS.title, "The title");
  checks.push(
    !input.resolvedTitle
      ? {
          id: "title",
          status: "warn",
          label: "No title",
          detail: "The title is the search result headline and the page's H1.",
        }
      : {
          id: "title",
          status: title.note ? "warn" : "pass",
          label: `Title — ${title.count} characters`,
          detail: title.note,
        },
  );

  const description = lengthNote(
    input.resolvedDescription,
    SEO_LENGTHS.description,
    "The description",
  );
  if (!input.resolvedDescription) {
    checks.push({
      id: "description",
      status: "warn",
      label: "No meta description",
      detail:
        "Google will lift a passage from the article instead. Writing one gives you control of the snippet.",
    });
  } else {
    checks.push({
      id: "description",
      status: description.note ? "warn" : "pass",
      label: `Description — ${description.count} characters`,
      detail:
        description.note ||
        (input.hasOwnDescription
          ? ""
          : "Inherited from the excerpt. Fine, unless you want a different snippet."),
    });
  }

  /* ---- URL --------------------------------------------------------------- */

  const problem = slugProblem(input.slug);
  checks.push(
    problem
      ? { id: "slug", status: "warn", label: "Slug needs attention", detail: problem }
      : {
          id: "slug",
          status: "pass",
          label: `URL — /blog/${input.slug}`,
          detail: "",
        },
  );

  if (input.canonicalUrl) {
    const offSite = !input.canonicalUrl.includes(SITE.host);
    checks.push({
      id: "canonical",
      status: offSite ? "warn" : "info",
      label: offSite ? "Canonical points off-site" : "Custom canonical URL set",
      detail: offSite
        ? "Search engines will credit that other URL instead of this one. Only do this for content you republished from elsewhere."
        : "Overrides the default canonical for this article.",
    });
  }

  /* ---- the body ---------------------------------------------------------- */

  if (!stats.words) {
    checks.push({
      id: "body",
      status: "warn",
      label: "The article is empty",
      detail: "There is nothing for a reader or a crawler to read yet.",
    });
  } else {
    const thin = stats.words < THIN_CONTENT_WORDS;
    checks.push({
      id: "body",
      status: thin ? "warn" : "pass",
      label: `${stats.words.toLocaleString("en-US")} words · ${stats.readingLabel}`,
      detail: thin
        ? `Under ${THIN_CONTENT_WORDS} words tends to read as a stub. Depth is not a ranking dial, but a thin page rarely satisfies the query it ranks for.`
        : "",
    });
  }

  // The page renders the title as the only H1. A second one in the body
  // competes with it and muddles the document outline.
  if (/<h1\b/i.test(input.bodyHtml)) {
    checks.push({
      id: "h1",
      status: "warn",
      label: "The body contains an H1",
      detail:
        "The article title is already the page's H1. Use Heading 2 for top-level sections.",
    });
  }

  if (stats.words > 400 && !/<h2\b/i.test(input.bodyHtml)) {
    checks.push({
      id: "structure",
      status: "warn",
      label: "No section headings",
      detail:
        "A long article without H2s is hard to skim, and headings are what produce jump-to links in results.",
    });
  }

  const images = input.bodyHtml.match(IMG_TAG) ?? [];
  const missingAlt = images.filter((tag) => !NON_EMPTY_ALT.test(tag)).length;
  if (images.length) {
    checks.push({
      id: "alt",
      status: missingAlt ? "warn" : "pass",
      label: missingAlt
        ? `${missingAlt} of ${images.length} images have no alt text`
        : `All ${images.length} images have alt text`,
      detail: missingAlt
        ? "Alt text is what a screen reader announces and what image search indexes. Leave it empty only for purely decorative images."
        : "",
    });
  }

  /* ---- sharing and navigation -------------------------------------------- */

  checks.push({
    id: "image",
    status: "info",
    label: input.hasImage ? "Share image set" : "Share image generated",
    detail: input.hasImage
      ? ""
      : "No cover or OG image, so the automatic 1200×630 card will be used.",
  });

  if (!input.excerpt) {
    checks.push({
      id: "excerpt",
      status: "info",
      label: "No excerpt",
      detail:
        "The blog index card and the RSS summary fall back to the meta description.",
    });
  }

  if (!input.tagCount) {
    checks.push({
      id: "tags",
      status: "info",
      label: "No tags",
      detail: "Tags drive the related-articles list and the tag filter on /blog.",
    });
  }

  /* ---- explicit opt-outs, stated loudly --------------------------------- */

  if (input.noindex) {
    checks.push({
      id: "noindex",
      status: "warn",
      label: "Set to noindex",
      detail:
        "This article is excluded from search results and from the sitemap. Intentional for a private page; a mistake otherwise.",
    });
  }

  if (input.nofollow) {
    checks.push({
      id: "nofollow",
      status: "warn",
      label: "Set to nofollow",
      detail: "Crawlers are told to ignore every link in this article.",
    });
  }

  return checks;
}

/** How many items want attention — for a summary line, not a score. */
export function countWarnings(checks: Check[]): number {
  return checks.filter((c) => c.status === "warn").length;
}
