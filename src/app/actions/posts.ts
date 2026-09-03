"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin";
import { isSafeUrl } from "@/lib/content/schema";
import { sanitizeArticleHtml } from "@/lib/content/sanitize";
import { extractFontFamilies } from "@/lib/fonts/extract";
import {
  isValidSlug,
  parseTagList,
  slugify,
  slugProblem,
  type Block,
  type RobotsFollow,
  type RobotsIndex,
} from "@/lib/posts";

/**
 * Article persistence.
 *
 * Three rules shape everything here:
 *
 *   1. **The body is untrusted.** `content_html` arrives from a browser, so it
 *      is run through the sanitiser before it is stored, and the `fonts` column
 *      is recomputed from the *sanitised* HTML rather than from the list the
 *      client sent. That closes the loop where a crafted family name could be
 *      interpolated into a Google Fonts URL on a public page.
 *   2. **A published URL is a promise.** Renaming a published article records
 *      the old slug so `/blog/<old>` keeps answering with a 301, and a collision
 *      is reported rather than silently resolved when the author typed the slug
 *      themselves.
 *   3. **Timestamps are facts.** `published_at` is stamped the first time an
 *      article goes live and then left alone; re-saving a published post does not
 *      move its date, and unpublishing does not erase it.
 */

export type PostActionState = {
  ok: boolean;
  message: string;
  /** Present on success, so the form can follow a slug that gained a suffix. */
  slug?: string;
  /**
   * The row id. On a *create* this is the only way the form learns it, and it
   * has to: without it, a second Save on the same page would insert a second
   * article rather than updating the first.
   */
  id?: string;
  /**
   * The row's new `updated_at`. The form hands this back on the next autosave
   * so a manual save does not leave the autosave loop looking stale.
   */
  updatedAt?: string;
} | null;

/**
 * Field caps. These are guard rails against a pathological payload, not
 * editorial advice — the SEO panel nudges about length in the UI and
 * deliberately does not truncate what an author typed.
 */
const LIMITS = {
  title: 300,
  excerpt: 600,
  seoTitle: 300,
  seoDescription: 600,
  url: 2048,
  tag: 48,
  tags: 12,
  html: 400_000,
} as const;

type Client = SupabaseClient;

/* ----------------------------------------------------------------- fields -- */

function trimmed(formData: FormData, key: string, max: number): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value ? value.slice(0, max) : null;
}

/** Tags as typed. Parsed by the shared helper so the form agrees with the DB. */
function parseTags(formData: FormData): string[] {
  return parseTagList(String(formData.get("tags") ?? ""));
}

/** A TipTap document, or null. Never a half-parsed object. */
function parseJsonDocument(raw: string): unknown | null {
  const text = raw.trim();
  if (!text) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return "type" in parsed ? parsed : null;
  } catch {
    return null;
  }
}

function parseDocument(formData: FormData): unknown | null {
  return parseJsonDocument(String(formData.get("content_json") ?? ""));
}

/** Legacy block content, preserved verbatim when the form still sends it. */
function parseBlocks(formData: FormData): Block[] | null {
  const raw = String(formData.get("blocks") ?? "").trim();
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Block[]) : null;
  } catch {
    return null;
  }
}

function robotsIndex(formData: FormData): RobotsIndex {
  return formData.get("robots_index") === "noindex" ? "noindex" : "index";
}

function robotsFollow(formData: FormData): RobotsFollow {
  return formData.get("robots_follow") === "nofollow" ? "nofollow" : "follow";
}

/* ------------------------------------------------------------------ slugs -- */

/**
 * Is this slug already spoken for — by another article, or by a redirect
 * pointing at one?
 *
 * The history table has to be consulted too. Letting a new article claim a slug
 * that currently 301s somewhere else would turn one working URL into two
 * conflicting ones.
 */
async function slugConflict(
  supabase: Client,
  slug: string,
  excludeId: string | null,
): Promise<boolean> {
  const posts = supabase.from("posts").select("id").eq("slug", slug).limit(1);
  const { data: taken } = await (excludeId ? posts.neq("id", excludeId) : posts);
  if (taken?.length) return true;

  const history = supabase
    .from("post_slug_history")
    .select("slug")
    .eq("slug", slug)
    .limit(1);
  const { data: redirected } = await (excludeId
    ? history.neq("post_id", excludeId)
    : history);
  return Boolean(redirected?.length);
}

/**
 * The first free slug in the `base`, `base-2`, `base-3`… sequence.
 *
 * Only used when the slug was derived from the title rather than typed. Ten
 * attempts is not a real limit — it is a stop so a database that is answering
 * every probe with "taken" cannot spin here forever.
 */
async function nextFreeSlug(
  supabase: Client,
  base: string,
  excludeId: string | null,
): Promise<string | null> {
  for (let n = 1; n <= 10; n += 1) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    if (!isValidSlug(candidate)) continue;
    if (!(await slugConflict(supabase, candidate, excludeId))) return candidate;
  }
  return null;
}

/* ------------------------------------------------------------------- save -- */

/** The subset of the existing row that changes how a save behaves. */
type ExistingPost = {
  slug: string;
  published: boolean;
  published_at: string | null;
};

/** URL fields, with the label used if one turns out to be unusable. */
const URL_FIELDS = [
  ["canonical_url", "canonical URL"],
  ["og_image", "Open Graph image URL"],
  ["cover_image", "cover image URL"],
] as const;

/** Create or update an article. Pass an `id` field to update. */
export async function savePost(
  _prev: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim() || null;

  const title = trimmed(formData, "title", LIMITS.title);
  if (!title) return { ok: false, message: "Title is required." };

  /* ---- body ------------------------------------------------------------- */

  const rawHtml = String(formData.get("content_html") ?? "");
  if (rawHtml.length > LIMITS.html) {
    return {
      ok: false,
      message:
        "This article is too large to save (over 400,000 characters of markup). Split it into two parts.",
    };
  }

  // Sanitise before storing, and derive the font list from the *result* — never
  // from the list the browser sent.
  const contentHtml = sanitizeArticleHtml(rawHtml) || null;
  const fonts = extractFontFamilies(contentHtml);
  const contentJson = parseDocument(formData);
  const blocks = parseBlocks(formData);

  /* ---- URLs ------------------------------------------------------------- */

  const urls: Record<string, string | null> = {};
  for (const [field, label] of URL_FIELDS) {
    const value = trimmed(formData, field, LIMITS.url);
    if (value && !isSafeUrl(value)) {
      return { ok: false, message: `That ${label} is not a valid http(s) URL.` };
    }
    urls[field] = value;
  }

  /* ---- slug ------------------------------------------------------------- */

  const typed = trimmed(formData, "slug", 200);
  // The form marks the slug as auto when the author has not edited the field.
  const auto = !typed || formData.get("slug_auto") === "1";
  const base = slugify(typed ?? title);

  const problem = slugProblem(base);
  if (problem) {
    return {
      ok: false,
      message: typed
        ? problem
        : `${problem} Add a slug by hand — the title alone does not produce a usable one.`,
    };
  }

  let existing: ExistingPost | null = null;
  if (id) {
    const { data, error } = await supabase
      .from("posts")
      .select("slug, published, published_at")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return { ok: false, message: "That article no longer exists." };
    }
    existing = data as ExistingPost;
  }

  let slug = base;
  let renamed = false;

  if (await slugConflict(supabase, slug, id)) {
    if (!auto) {
      return {
        ok: false,
        message: `The URL /blog/${slug} is already in use. Pick a different slug.`,
      };
    }
    const free = await nextFreeSlug(supabase, base, id);
    if (!free) {
      return {
        ok: false,
        message: `Could not find a free URL near /blog/${base}. Type a slug by hand.`,
      };
    }
    renamed = free !== base;
    slug = free;
  }

  /* ---- publication state ------------------------------------------------ */

  const published = formData.get("published") === "on";

  /**
   * Stamp `published_at` once, the first time an article actually goes live.
   * Re-saving a published post keeps its original date, and unpublishing keeps
   * it too — the article *was* published on that day, and clearing the column
   * would destroy the only record of when.
   */
  const publishedAt = existing?.published_at
    ? existing.published_at
    : published
      ? new Date().toISOString()
      : null;

  const payload: Record<string, unknown> = {
    title,
    slug,
    excerpt: trimmed(formData, "excerpt", LIMITS.excerpt),
    content_html: contentHtml,
    content_json: contentJson,
    fonts,
    seo_title: trimmed(formData, "seo_title", LIMITS.seoTitle),
    seo_description: trimmed(formData, "seo_description", LIMITS.seoDescription),
    canonical_url: urls.canonical_url,
    og_title: trimmed(formData, "og_title", LIMITS.seoTitle),
    og_description: trimmed(formData, "og_description", LIMITS.seoDescription),
    og_image: urls.og_image,
    twitter_title: trimmed(formData, "twitter_title", LIMITS.seoTitle),
    twitter_description: trimmed(
      formData,
      "twitter_description",
      LIMITS.seoDescription,
    ),
    cover_image: urls.cover_image,
    tags: parseTags(formData),
    robots_index: robotsIndex(formData),
    robots_follow: robotsFollow(formData),
    published,
    published_at: publishedAt,
  };

  // Only write `blocks` when the form actually carried them. Omitting the key
  // leaves a legacy article's original block content untouched.
  if (blocks) payload.blocks = blocks;

  /* ---- write ------------------------------------------------------------ */

  const { data: saved, error } = await (id
    ? supabase
        .from("posts")
        .update(payload)
        .eq("id", id)
        .select("id, updated_at")
        .maybeSingle()
    : supabase
        .from("posts")
        .insert(payload)
        .select("id, updated_at")
        .maybeSingle());

  if (error) {
    // 23505 is a unique violation. The pre-flight check above catches the
    // ordinary case; this catches a race with another save.
    if (error.code === "23505") {
      return {
        ok: false,
        message: `The URL /blog/${slug} was taken while you were saving. Try again.`,
      };
    }
    console.error("savePost failed:", error.code, error.message);
    return { ok: false, message: "Save failed — check the fields and retry." };
  }

  const row = saved as { id?: string; updated_at?: string } | null;
  const postId = id ?? (row?.id ?? null);

  /* ---- keep the old URL alive ------------------------------------------- */

  const previousSlug = existing?.slug;
  if (postId && previousSlug && previousSlug !== slug) {
    // Only a slug that was publicly reachable is worth redirecting.
    if (existing?.published) {
      await supabase
        .from("post_slug_history")
        .upsert({ slug: previousSlug, post_id: postId }, { onConflict: "slug" });
    }
    // The new slug must not also be a redirect to somewhere — including to this
    // same article, from an earlier rename that has now been undone.
    await supabase.from("post_slug_history").delete().eq("slug", slug);
    revalidatePath(`/blog/${previousSlug}`);
  }

  /* ---- caches ----------------------------------------------------------- */

  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/admin/articles");
  // Both are generated from the published set, so a publish/unpublish or a
  // rename changes them.
  revalidatePath("/sitemap.xml");
  revalidatePath("/feed.xml");

  const note = renamed ? ` The URL became /blog/${slug} — that slug was taken.` : "";

  return {
    ok: true,
    slug,
    id: postId ?? undefined,
    updatedAt: row?.updated_at,
    message: published
      ? `Published at /blog/${slug}.${note}`
      : `Draft saved.${note}`,
  };
}

/* --------------------------------------------------------------- autosave -- */

/**
 * Autosave, for drafts only.
 *
 * Two refusals are the whole design:
 *
 *   1. **Published articles are never autosaved.** Typing into a live article
 *      should not push half-written sentences to readers. The form knows this
 *      and shows "unsaved" instead; publishing an edit stays a deliberate
 *      button press.
 *   2. **A stale write is refused, not merged.** The client sends the
 *      `updated_at` it last saw and the update is filtered on it, so if the same
 *      draft was saved from another tab in the meantime this touches nothing and
 *      says so. Silently winning that race is how an author loses a paragraph
 *      they wrote somewhere else.
 *
 * Slug, publication state and `published_at` are deliberately absent: this only
 * ever moves body and metadata.
 */
export type AutosaveInput = {
  id: string;
  /** The `updated_at` the client last observed for this row. */
  seenUpdatedAt: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  contentJson: string;
  coverImage: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterTitle: string;
  twitterDescription: string;
  robotsIndex: RobotsIndex;
  robotsFollow: RobotsFollow;
};

export type AutosaveResult =
  | { ok: true; updatedAt: string }
  | {
      ok: false;
      /** `published` and `stale` are expected states, not bugs. */
      reason: "published" | "stale" | "missing" | "invalid" | "error";
      message: string;
    };

/** Trim, cap, and turn "" into null the same way the form save does. */
function capped(value: string, max: number): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export async function autosaveDraft(input: AutosaveInput): Promise<AutosaveResult> {
  const { supabase } = await requireAdmin();

  const title = input.title.trim().slice(0, LIMITS.title);
  if (!title) {
    return { ok: false, reason: "invalid", message: "Add a title before autosave can run." };
  }
  if (input.contentHtml.length > LIMITS.html) {
    return {
      ok: false,
      reason: "invalid",
      message: "Too large to autosave — save manually once the article is split.",
    };
  }

  const { data: current, error: readError } = await supabase
    .from("posts")
    .select("published, updated_at")
    .eq("id", input.id)
    .maybeSingle();

  if (readError || !current) {
    return { ok: false, reason: "missing", message: "That article no longer exists." };
  }

  const row = current as { published: boolean; updated_at: string };
  if (row.published) {
    return {
      ok: false,
      reason: "published",
      message: "This article is live — save manually to publish changes.",
    };
  }
  if (row.updated_at !== input.seenUpdatedAt) {
    return {
      ok: false,
      reason: "stale",
      message: "This draft changed somewhere else. Reload before saving to avoid overwriting it.",
    };
  }

  // Same trust boundary as a manual save: sanitise, then derive the font list
  // from the result rather than from anything the browser claimed.
  const contentHtml = sanitizeArticleHtml(input.contentHtml) || null;

  // A bad URL should not stall autosave with a modal-worthy error; drop the
  // offending value and let the manual save report it properly.
  const url = (value: string) => {
    const trimmed = capped(value, LIMITS.url);
    return trimmed && isSafeUrl(trimmed) ? trimmed : null;
  };

  const { data: saved, error } = await supabase
    .from("posts")
    .update({
      title,
      excerpt: capped(input.excerpt, LIMITS.excerpt),
      content_html: contentHtml,
      content_json: parseJsonDocument(input.contentJson),
      fonts: extractFontFamilies(contentHtml),
      cover_image: url(input.coverImage),
      og_image: url(input.ogImage),
      canonical_url: url(input.canonicalUrl),
      seo_title: capped(input.seoTitle, LIMITS.seoTitle),
      seo_description: capped(input.seoDescription, LIMITS.seoDescription),
      og_title: capped(input.ogTitle, LIMITS.seoTitle),
      og_description: capped(input.ogDescription, LIMITS.seoDescription),
      twitter_title: capped(input.twitterTitle, LIMITS.seoTitle),
      twitter_description: capped(input.twitterDescription, LIMITS.seoDescription),
      tags: input.tags.map((t) => t.trim().slice(0, LIMITS.tag)).filter(Boolean).slice(0, LIMITS.tags),
      robots_index: input.robotsIndex === "noindex" ? "noindex" : "index",
      robots_follow: input.robotsFollow === "nofollow" ? "nofollow" : "follow",
    })
    // Compare-and-swap: the filter is what makes a lost update impossible.
    .eq("id", input.id)
    .eq("updated_at", input.seenUpdatedAt)
    .select("updated_at")
    .maybeSingle();

  if (error) {
    console.error("autosaveDraft failed:", error.code, error.message);
    return { ok: false, reason: "error", message: "Autosave failed." };
  }

  const updatedAt = (saved as { updated_at?: string } | null)?.updated_at;
  if (!updatedAt) {
    return {
      ok: false,
      reason: "stale",
      message: "This draft changed somewhere else. Reload before saving to avoid overwriting it.",
    };
  }

  // A draft has no public page to invalidate, but the admin list shows the
  // title and the "last edited" time.
  revalidatePath("/admin/articles");

  return { ok: true, updatedAt };
}

/* ----------------------------------------------------------------- delete -- */

/** Delete an article and return to the article list. */
export async function deletePost(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();

  if (id) {
    const { data } = await supabase
      .from("posts")
      .select("slug")
      .eq("id", id)
      .maybeSingle();

    await supabase.from("posts").delete().eq("id", id);

    const slug = (data as { slug?: string } | null)?.slug;
    if (slug) revalidatePath(`/blog/${slug}`);
    revalidatePath("/blog");
    revalidatePath("/admin/articles");
    revalidatePath("/sitemap.xml");
    revalidatePath("/feed.xml");
  }

  redirect("/admin/articles");
}





