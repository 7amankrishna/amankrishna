import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import type { SiteFont } from "@/lib/fonts/types";

type FontRow = {
  id: string;
  family: string;
  source: string;
  weights: number[] | null;
  style: string | null;
  url: string | null;
  fallback: string | null;
};

function toSiteFont(row: FontRow): SiteFont {
  return {
    id: row.id,
    family: row.family,
    source: row.source === "custom" ? "custom" : "google",
    weights: row.weights?.length ? row.weights : [400, 700],
    style: row.style === "italic" ? "italic" : "normal",
    url: row.url,
    fallback: row.fallback || "sans-serif",
  };
}

/**
 * The whole font library. Read by the editor (to populate the picker) and by
 * the public article page (to resolve `@font-face` for the families that
 * article uses).
 *
 * Returns [] when Supabase is not configured — the site still renders with
 * system fonts, which is the whole point of them being zero-cost.
 */
export async function getFontLibrary(): Promise<SiteFont[]> {
  if (!supabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_fonts")
    .select("id, family, source, weights, style, url, fallback")
    .order("family", { ascending: true });

  if (error) {
    console.error("getFontLibrary failed:", error.message);
    return [];
  }
  return (data ?? []).map((row) => toSiteFont(row as FontRow));
}

/**
 * Only the library entries an article needs. Saves the public page from
 * fetching (and the client from parsing) the entire library.
 */
export async function getFontsForFamilies(
  families: string[],
): Promise<SiteFont[]> {
  const wanted = families.filter(Boolean);
  if (!wanted.length || !supabaseConfigured()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_fonts")
    .select("id, family, source, weights, style, url, fallback")
    .in("family", wanted);

  if (error) {
    console.error("getFontsForFamilies failed:", error.message);
    return [];
  }
  return (data ?? []).map((row) => toSiteFont(row as FontRow));
}
