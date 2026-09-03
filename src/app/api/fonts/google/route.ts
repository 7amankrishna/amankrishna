import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import {
  GOOGLE_FONT_CATALOG,
  searchCatalog,
  type CatalogEntry,
} from "@/lib/fonts/catalog";

/**
 * Font search for the admin font manager.
 *
 * With `GOOGLE_FONTS_API_KEY` set this proxies the Google Fonts Developer API,
 * so the whole ~1,800-family catalogue is searchable. Without a key it searches
 * the bundled offline catalogue instead — the feature degrades in breadth, not
 * in function, and never hard-fails on a missing credential.
 *
 * Admin-only: it is a proxy holding a server-side key, so it must not be an
 * open relay. It also never returns font *files*, only metadata.
 */

const GOOGLE_API = "https://www.googleapis.com/webfonts/v1/webfonts";

/** Cache the upstream catalogue for a day — it changes rarely. */
const REVALIDATE_SECONDS = 60 * 60 * 24;

type GoogleFontsItem = {
  family?: unknown;
  category?: unknown;
  variants?: unknown;
};

const CATEGORIES: CatalogEntry["category"][] = [
  "sans-serif",
  "serif",
  "display",
  "handwriting",
  "monospace",
];

function toCategory(value: unknown): CatalogEntry["category"] {
  const found = CATEGORIES.find((c) => c === value);
  return found ?? "sans-serif";
}

/**
 * Google reports variants as `"100"`, `"regular"`, `"italic"`, `"700italic"`.
 * Collapse them into the numeric weights available and whether italic exists.
 */
function parseVariants(value: unknown): { weights: number[]; italic: boolean } {
  const variants = Array.isArray(value) ? value : [];
  const weights = new Set<number>();
  let italic = false;

  for (const raw of variants) {
    if (typeof raw !== "string") continue;
    const variant = raw.toLowerCase();
    if (variant.includes("italic")) italic = true;

    const numeric = variant.replace("italic", "");
    if (!numeric || numeric === "regular") {
      weights.add(400);
      continue;
    }
    const weight = Number(numeric);
    if (Number.isInteger(weight) && weight >= 100 && weight <= 1000) {
      weights.add(weight);
    }
  }

  return {
    weights: [...weights].sort((a, b) => a - b),
    italic,
  };
}

function toEntry(item: GoogleFontsItem): CatalogEntry | null {
  if (typeof item.family !== "string" || !item.family.trim()) return null;
  const { weights, italic } = parseVariants(item.variants);
  return {
    family: item.family,
    category: toCategory(item.category),
    weights: weights.length ? weights : [400],
    italic,
  };
}

async function searchGoogle(
  query: string,
  limit: number,
  key: string,
): Promise<CatalogEntry[] | null> {
  const url = `${GOOGLE_API}?sort=popularity&key=${encodeURIComponent(key)}`;

  try {
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) {
      console.error("Google Fonts API responded", res.status);
      return null;
    }

    const body: unknown = await res.json();
    const items =
      body && typeof body === "object" && Array.isArray((body as { items?: unknown }).items)
        ? ((body as { items: unknown[] }).items as GoogleFontsItem[])
        : [];

    const q = query.trim().toLowerCase();
    const entries: CatalogEntry[] = [];
    for (const item of items) {
      const entry = toEntry(item);
      if (!entry) continue;
      if (q && !entry.family.toLowerCase().includes(q)) continue;
      entries.push(entry);
      if (entries.length >= limit) break;
    }
    return entries;
  } catch (err) {
    console.error("Google Fonts API request failed:", err);
    return null;
  }
}

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const query = (params.get("q") ?? "").slice(0, 60);
  const limitParam = Number(params.get("limit"));
  const limit = Number.isInteger(limitParam)
    ? Math.min(Math.max(limitParam, 1), 60)
    : 30;

  const key = process.env.GOOGLE_FONTS_API_KEY?.trim();
  if (key) {
    const live = await searchGoogle(query, limit, key);
    if (live) {
      return NextResponse.json({ source: "google", fonts: live });
    }
    // Fall through to the offline catalogue rather than showing an empty list.
  }

  return NextResponse.json({
    source: "catalog",
    fonts: searchCatalog(query, limit),
    total: GOOGLE_FONT_CATALOG.length,
  });
}
