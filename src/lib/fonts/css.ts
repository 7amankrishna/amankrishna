import { isSafeFontUrl } from "@/lib/content/schema";
import { SYSTEM_FONTS, type SiteFont } from "@/lib/fonts/types";

/**
 * Turning a font library entry into CSS.
 *
 * Two rules drive everything here:
 *   1. **Nothing is loaded until it is used.** A family added to the library
 *      costs published pages zero bytes; only the families a given article
 *      actually references get a stylesheet on that article.
 *   2. **Only whole families the author picked.** Weights are narrowed to the
 *      ones the family really ships, so no 404 axis requests.
 */

/**
 * Origin serving the Google-Fonts-compatible CSS2 API.
 *
 * Defaults to Google. Set NEXT_PUBLIC_FONT_CSS_ORIGIN to a GDPR-friendly,
 * API-compatible mirror (for example https://fonts.bunny.net) to serve the
 * same families without Google's CDN seeing reader IPs.
 */
export const FONT_CSS_ORIGIN = (
  process.env.NEXT_PUBLIC_FONT_CSS_ORIGIN || "https://fonts.googleapis.com"
).replace(/\/+$/, "");

/** Matching font-file host, needed for the `preconnect` hint. */
export const FONT_FILE_ORIGIN = FONT_CSS_ORIGIN.includes("bunny.net")
  ? "https://fonts.bunny.net"
  : "https://fonts.gstatic.com";

/** `Playfair Display` → `Playfair+Display` */
function urlFamily(family: string): string {
  return family.trim().replace(/\s+/g, "+");
}

/**
 * CSS2 stylesheet URL for a set of Google families.
 * Returns null when there is nothing to request.
 */
export function googleFontsCssUrl(
  fonts: { family: string; weights: number[] }[],
): string | null {
  const parts = fonts
    .filter((f) => f.family.trim())
    .map((f) => {
      const weights = [...new Set(f.weights)]
        .filter((w) => Number.isInteger(w) && w >= 100 && w <= 1000)
        .sort((a, b) => a - b);
      const axis = weights.length ? `:wght@${weights.join(";")}` : "";
      return `family=${urlFamily(f.family)}${axis}`;
    });

  if (!parts.length) return null;
  // display=swap keeps text painted with the fallback instead of blocking LCP.
  return `${FONT_CSS_ORIGIN}/css2?${parts.join("&")}&display=swap`;
}

/** `.woff2` → `woff2`, for the `format()` hint. */
function formatOf(url: string): string | null {
  const ext = url.split(/[?#]/)[0].split(".").pop()?.toLowerCase();
  switch (ext) {
    case "woff2":
      return "woff2";
    case "woff":
      return "woff";
    case "ttf":
      return "truetype";
    case "otf":
      return "opentype";
    default:
      return null;
  }
}

/** Escape a family name for safe use inside a CSS string literal. */
function cssString(value: string): string {
  return value.replace(/[\\"]/g, "");
}

/**
 * `@font-face` block for a custom font, or null when the URL is a stylesheet
 * (those are linked, not inlined) or fails validation.
 *
 * Validation happens here as well as at write time so a row that predates a
 * tightened rule can never emit CSS.
 */
export function customFontFace(font: SiteFont): string | null {
  if (font.source !== "custom" || !font.url) return null;
  if (!isSafeFontUrl(font.url)) return null;

  const format = formatOf(font.url);
  if (!format) return null; // .css handled by customFontStylesheets

  const weights = font.weights.length ? font.weights : [400];
  const range =
    weights.length > 1
      ? `${Math.min(...weights)} ${Math.max(...weights)}`
      : String(weights[0]);

  return [
    "@font-face {",
    `  font-family: "${cssString(font.family)}";`,
    `  src: url("${font.url}") format("${format}");`,
    `  font-weight: ${range};`,
    `  font-style: ${font.style};`,
    "  font-display: swap;",
    "}",
  ].join("\n");
}

/** Custom entries whose URL is a stylesheet — these get a `<link>`. */
export function customFontStylesheets(fonts: SiteFont[]): string[] {
  return fonts
    .filter(
      (f) =>
        f.source === "custom" &&
        f.url &&
        isSafeFontUrl(f.url) &&
        /\.css(\?|$)/i.test(f.url),
    )
    .map((f) => f.url as string);
}

/**
 * Everything needed to render exactly the fonts an article uses.
 * `families` is the list extracted from the body's inline styles.
 */
export function resolveArticleFonts(
  families: string[],
  library: SiteFont[],
): {
  googleCssUrl: string | null;
  customCss: string;
  customStylesheets: string[];
  needsPreconnect: boolean;
} {
  const wanted = new Set(families.filter(Boolean));
  const all = [...SYSTEM_FONTS, ...library];
  const used = all.filter((f) => wanted.has(f.family));

  const google = used.filter((f) => f.source === "google");
  const custom = used.filter((f) => f.source === "custom");

  const googleCssUrl = google.length
    ? googleFontsCssUrl(google.map((f) => ({ family: f.family, weights: f.weights })))
    : null;

  const customCss = custom
    .map(customFontFace)
    .filter((css): css is string => Boolean(css))
    .join("\n");

  return {
    googleCssUrl,
    customCss,
    customStylesheets: customFontStylesheets(custom),
    needsPreconnect: Boolean(googleCssUrl),
  };
}

/**
 * The value written into the document's inline `font-family`.
 * Quoted family + fallback stack, kept short so the markup stays readable.
 */
export function fontStack(font: SiteFont): string {
  const needsQuotes = /[^a-zA-Z0-9-]/.test(font.family);
  const name = needsQuotes ? `"${cssString(font.family)}"` : font.family;
  return font.fallback ? `${name}, ${font.fallback}` : name;
}
