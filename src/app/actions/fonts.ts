"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { isSafeFontUrl } from "@/lib/content/schema";
import { fallbackFor, GOOGLE_FONT_CATALOG } from "@/lib/fonts/catalog";
import { OFFERED_WEIGHTS, isSystemFamily, type SiteFont } from "@/lib/fonts/types";
import { getFontLibrary } from "@/lib/fonts/query";

export type FontActionResult =
  | { ok: true; message: string; fonts: SiteFont[] }
  | { ok: false; message: string };

/** Family names must be plain CSS identifiers — no quotes, braces or semicolons. */
const FAMILY_RE = /^[\w][\w \-.]{0,63}$/;

function normalizeWeights(input: unknown): number[] {
  const list = Array.isArray(input) ? input : [];
  const clean = [
    ...new Set(
      list
        .map((w) => Number(w))
        .filter((w) => Number.isInteger(w) && w >= 100 && w <= 1000),
    ),
  ].sort((a, b) => a - b);
  return clean.length ? clean : [400, 700];
}

/**
 * Add a Google family to the library.
 *
 * Only the weights the family actually ships are stored, so the CSS2 request
 * never asks for an axis that does not exist. Nothing is downloaded here — the
 * stylesheet is requested lazily, per article, at render time.
 */
export async function addGoogleFont(input: {
  family: string;
  weights: number[];
  category?: string;
}): Promise<FontActionResult> {
  const { supabase } = await requireAdmin();

  const family = input.family.trim();
  if (!FAMILY_RE.test(family))
    return { ok: false, message: "That font family name is not valid." };
  if (isSystemFamily(family))
    return { ok: false, message: `"${family}" is already available as a system font.` };

  // Prefer the catalogue's real weight list over whatever the client sent.
  const known = GOOGLE_FONT_CATALOG.find(
    (f) => f.family.toLowerCase() === family.toLowerCase(),
  );
  const requested = normalizeWeights(input.weights);
  const weights = known
    ? requested.filter((w) => known.weights.includes(w))
    : requested;

  const category = (known?.category ??
    (input.category as never) ??
    "sans-serif") as Parameters<typeof fallbackFor>[0];

  const { error } = await supabase.from("site_fonts").insert({
    family,
    source: "google",
    weights: weights.length ? weights : known?.weights.slice(0, 4) ?? [400, 700],
    style: "normal",
    url: null,
    fallback: fallbackFor(category),
  });

  if (error) {
    if (error.code === "23505")
      return { ok: false, message: `"${family}" is already in your library.` };
    console.error("addGoogleFont failed:", error.message);
    return { ok: false, message: "Could not add that font — try again." };
  }

  revalidatePath("/admin/articles");
  return {
    ok: true,
    message: `Added ${family}.`,
    fonts: await getFontLibrary(),
  };
}

/**
 * Add a self-hosted / third-party font by URL.
 *
 * The URL must be https and end in a real font or stylesheet extension. That
 * rules out pointing the loader at an arbitrary HTML endpoint, and combined
 * with the CSS allow-list it means a font entry cannot become a CSS injection.
 */
export async function addCustomFont(input: {
  family: string;
  url: string;
  weight: number;
  style: "normal" | "italic";
  fallback?: string;
}): Promise<FontActionResult> {
  const { supabase } = await requireAdmin();

  const family = input.family.trim();
  const url = input.url.trim();

  if (!FAMILY_RE.test(family))
    return { ok: false, message: "Font name must be letters, numbers, spaces, - or . only." };
  if (isSystemFamily(family))
    return { ok: false, message: `"${family}" collides with a built-in font name.` };
  if (!isSafeFontUrl(url))
    return {
      ok: false,
      message: "Use an https URL ending in .woff2, .woff, .ttf, .otf or .css",
    };

  const weight = normalizeWeights([input.weight])[0];
  const fallback = (input.fallback ?? "sans-serif").trim();
  if (!/^[\w\s,-]{1,80}$/.test(fallback))
    return { ok: false, message: "Fallback stack contains unsupported characters." };

  const { error } = await supabase.from("site_fonts").insert({
    family,
    source: "custom",
    weights: [weight],
    style: input.style === "italic" ? "italic" : "normal",
    url,
    fallback,
  });

  if (error) {
    if (error.code === "23505")
      return { ok: false, message: `"${family}" is already in your library.` };
    console.error("addCustomFont failed:", error.message);
    return { ok: false, message: "Could not add that font — try again." };
  }

  revalidatePath("/admin/articles");
  return {
    ok: true,
    message: `Added ${family}.`,
    fonts: await getFontLibrary(),
  };
}

/**
 * Remove a font from the library.
 *
 * Articles that already reference it keep their inline `font-family`, which
 * then falls back to the stack's next entry — no published page breaks, it just
 * stops loading a webfont.
 */
export async function removeFont(id: string): Promise<FontActionResult> {
  const { supabase } = await requireAdmin();

  const { error } = await supabase.from("site_fonts").delete().eq("id", id);
  if (error) {
    console.error("removeFont failed:", error.message);
    return { ok: false, message: "Could not remove that font." };
  }

  revalidatePath("/admin/articles");
  return { ok: true, message: "Font removed.", fonts: await getFontLibrary() };
}

/** Weights the editor may offer for a family, narrowed to what it ships. */
export async function weightsFor(family: string): Promise<number[]> {
  const known = GOOGLE_FONT_CATALOG.find((f) => f.family === family);
  if (known) return known.weights.filter((w) => OFFERED_WEIGHTS.includes(w as never));
  return [...OFFERED_WEIGHTS];
}
