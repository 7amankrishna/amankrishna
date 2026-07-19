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

export type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  blocks: Block[];
  seo_title: string | null;
  seo_description: string | null;
  cover_image: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Turn a title into a URL-safe slug. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
