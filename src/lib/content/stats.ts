import { SITE } from "@/lib/site";

/**
 * Article statistics — word count, character count and reading time.
 *
 * Isomorphic and dependency-free so the editor footer (client) and the public
 * article header (server) report identical numbers.
 */

export type ArticleStats = {
  words: number;
  /** Characters including spaces, as writers expect. */
  characters: number;
  charactersNoSpaces: number;
  /** Whole minutes, floored at 1 for any non-empty article. */
  readingMinutes: number;
  /** Pre-formatted "8 min read" / "" for empty content. */
  readingLabel: string;
};

const EMPTY: ArticleStats = {
  words: 0,
  characters: 0,
  charactersNoSpaces: 0,
  readingMinutes: 0,
  readingLabel: "",
};

/** Count words in already-plain text. */
export function statsFromText(text: string): ArticleStats {
  const trimmed = text.trim();
  if (!trimmed) return EMPTY;

  const words = trimmed.split(/\s+/).filter(Boolean).length;
  const readingMinutes = Math.max(
    1,
    Math.round(words / SITE.readingWordsPerMinute),
  );

  return {
    words,
    characters: trimmed.length,
    charactersNoSpaces: trimmed.replace(/\s/g, "").length,
    readingMinutes,
    readingLabel: `${readingMinutes} min read`,
  };
}

/**
 * Strip tags with a regex rather than a parser so this stays isomorphic.
 * Block-level closers become spaces first, otherwise "</p><p>" would fuse
 * the last and first words of adjacent paragraphs into one.
 */
export function stripTags(html: string): string {
  return html
    .replace(/<\/(p|h[1-6]|li|blockquote|pre|div|figcaption|tr)>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function statsFromHtml(html: string | null | undefined): ArticleStats {
  if (!html) return EMPTY;
  return statsFromText(stripTags(html));
}

/** Format a word count the way the editor footer shows it (1,842). */
export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

/**
 * First N characters of the body, cut on a word boundary — used to suggest an
 * excerpt or meta description when the author has not written one.
 */
export function summarize(html: string | null | undefined, max = 155): string {
  const text = stripTags(html ?? "");
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
