import { summarize } from "@/lib/content/stats";

/**
 * What a search engine and a social card will actually show.
 *
 * The fallback chain lives here, in one isomorphic module, because two very
 * different consumers have to agree on it: `generateMetadata` on the server,
 * which emits the real tags, and the editor's preview panes in the browser. If
 * the preview computed its own fallbacks it would eventually drift, and a
 * preview that disagrees with the shipped tag is worse than no preview — it
 * teaches the author something false about their own page.
 *
 * Nothing here truncates. Length is *guidance*: the notes below describe how a
 * value is likely to be treated, and the author decides. Google itself
 * rewrites roughly two thirds of titles anyway, so a hard cap in the input
 * field would be a lie dressed up as a feature.
 */

export type SeoSource = {
  title: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  excerpt?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  twitterTitle?: string | null;
  twitterDescription?: string | null;
  /** Body HTML, used only to derive a description when nothing else exists. */
  bodyHtml?: string | null;
};

export type ResolvedSeo = {
  /** `<title>` and the search-result headline. */
  title: string;
  /** `<meta name="description">` and the search-result snippet. */
  description: string;
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;
};

function clean(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

/** First non-empty value in the chain. */
function first(...values: (string | null | undefined)[]): string {
  for (const value of values) {
    const trimmed = clean(value);
    if (trimmed) return trimmed;
  }
  return "";
}

/**
 * Resolve every title/description slot from what the author filled in.
 *
 * The chains mirror how the platforms themselves degrade: Twitter falls back to
 * the Open Graph tag, which falls back to the page title. Writing that out
 * explicitly means the previews can show the *inherited* value greyed out
 * instead of an empty box that implies the card will be blank.
 */
export function resolveSeo(source: SeoSource): ResolvedSeo {
  const title = first(source.seoTitle, source.title);
  const description = first(
    source.seoDescription,
    source.excerpt,
    summarize(source.bodyHtml, 155),
  );
  const ogTitle = first(source.ogTitle, title);
  const ogDescription = first(source.ogDescription, description);

  return {
    title,
    description,
    ogTitle,
    ogDescription,
    twitterTitle: first(source.twitterTitle, ogTitle),
    twitterDescription: first(source.twitterDescription, ogDescription),
  };
}

/* -------------------------------------------------------------- guidance -- */

/**
 * Comfortable ranges, in characters.
 *
 * These are pixel-width heuristics rounded to characters — Google truncates on
 * rendered width, not count, so they can only ever be approximate. That is
 * exactly why they produce a note and never a `maxLength`.
 */
export const SEO_LENGTHS = {
  title: { min: 15, max: 60 },
  description: { min: 70, max: 160 },
  excerpt: { min: 40, max: 300 },
} as const;

export type LengthLevel = "empty" | "short" | "ok" | "long";

export type LengthNote = {
  level: LengthLevel;
  count: number;
  /** Short human sentence, or "" when there is nothing worth saying. */
  note: string;
};

/** Character count plus a plain-language note about it. */
export function lengthNote(
  value: string | null | undefined,
  range: { min: number; max: number },
  label = "This",
): LengthNote {
  const count = clean(value).length;
  if (!count) return { level: "empty", count, note: "" };
  if (count < range.min) {
    return {
      level: "short",
      count,
      note: `${label} is short — around ${range.min}–${range.max} characters reads best.`,
    };
  }
  if (count > range.max) {
    return {
      level: "long",
      count,
      note: `${label} is over ${range.max} characters and may be cut short in results.`,
    };
  }
  return { level: "ok", count, note: "" };
}

/* ------------------------------------------------------------------- url -- */

/**
 * A search result's URL line: `amankrishna.in › blog › my-post`.
 *
 * Google shows a breadcrumb rather than a raw path, so the preview does too.
 */
export function breadcrumbUrl(host: string, path: string): string {
  const segments = path.split("/").filter(Boolean);
  return [host, ...segments].join(" › ");
}
