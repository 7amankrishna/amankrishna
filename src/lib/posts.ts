/** Block-based article content model, stored as jsonb in Supabase. */

export type BlockType =
  | "paragraph"
  | "heading"
  | "image"
  | "code"
  | "quote"
  | "list"
  | "divider";

export type Block = {
  id: string;
  type: BlockType;
  /** text for paragraph/heading/code/quote; image URL for image */
  content: string;
  /** heading level (2|3), image alt, code language, list items */
  meta?: {
    level?: 2 | 3;
    alt?: string;
    lang?: string;
    items?: string[];
  };
};

/** Robots directives stored per article. */
export type RobotsIndex = "index" | "noindex";
export type RobotsFollow = "follow" | "nofollow";

export type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  /** Legacy block content. Kept forever so old articles keep rendering. */
  blocks: Block[];
  /**
   * Rich-text body as sanitized HTML — the current authoring format.
   * `null` on articles authored before the rich-text editor landed.
   */
  content_html: string | null;
  /** TipTap document JSON, for lossless round-tripping in the editor. */
  content_json: unknown | null;
  seo_title: string | null;
  seo_description: string | null;
  canonical_url: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  twitter_title: string | null;
  twitter_description: string | null;
  cover_image: string | null;
  /** Font families referenced by the body, so only those are loaded. */
  fonts: string[];
  tags: string[];
  robots_index: RobotsIndex;
  robots_follow: RobotsFollow;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Columns selected for blog index cards — keeps the payload small. */
export type PostSummary = Pick<
  Post,
  | "id"
  | "slug"
  | "title"
  | "excerpt"
  | "cover_image"
  | "og_image"
  | "tags"
  | "published_at"
  | "updated_at"
>;

/** Reserved paths that must never be taken by an article slug. */
const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "blog",
  "login",
  "feed",
  "sitemap",
  "robots",
  "manifest",
  "new",
  "edit",
]);

/** Unicode combining marks, i.e. what NFKD splits an accent into. */
const COMBINING_MARKS = /[\u0300-\u036f]/g;

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const SLUG_MAX_LENGTH = 96;

/**
 * Turn a title into a URL-safe slug.
 * Handles accents, ampersands and punctuation, and caps the length so URLs
 * stay readable. Matches the DB check constraint `^[a-z0-9]+(-[a-z0-9]+)*$`.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-$/, "");
}

/** True when a slug is storable and safe to publish at /blog/<slug>. */
export function isValidSlug(slug: string): boolean {
  return (
    SLUG_PATTERN.test(slug) &&
    slug.length <= SLUG_MAX_LENGTH &&
    !RESERVED_SLUGS.has(slug)
  );
}

export function slugProblem(slug: string): string | null {
  if (!slug) return "Slug is required.";
  if (RESERVED_SLUGS.has(slug)) return `"${slug}" is a reserved path.`;
  if (!SLUG_PATTERN.test(slug))
    return "Use lowercase letters, numbers and single hyphens only.";
  if (slug.length > SLUG_MAX_LENGTH) return "Slug is too long (96 characters max).";
  return null;
}

/** Caps for the tag field, shared by the form and the save action. */
export const TAG_MAX_LENGTH = 48;
export const TAGS_MAX = 12;

/**
 * Tags as typed: comma or newline separated, de-duplicated case-insensitively
 * but stored with the author's own capitalisation.
 *
 * Isomorphic because the form needs it to build an autosave payload and the
 * save action needs it to parse the posted field — two parsers would eventually
 * disagree about something like a trailing comma.
 */
export function parseTagList(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const part of raw.split(/[,\n]/)) {
    const tag = part.trim().replace(/\s+/g, " ").slice(0, TAG_MAX_LENGTH);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= TAGS_MAX) break;
  }
  return out;
}
