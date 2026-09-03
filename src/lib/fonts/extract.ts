/**
 * Which font families does a body actually reference?
 *
 * Isomorphic and regex-based on purpose: the editor calls it in the browser to
 * fill the `fonts` column, the save action calls it again on the server to
 * recompute that column from the sanitized HTML, and the article page trusts the
 * stored list. Parsing with a DOM would work in exactly one of those three
 * places.
 *
 * Only the *head* of each stack is collected — `font-family: "Inter", serif`
 * means the author picked Inter, and `serif` is the fallback, not a family to go
 * and download.
 */

/**
 * One `font-family` value, stopping at whatever ends it.
 *
 * The value is a run of either a *balanced* quoted family name or a character
 * that cannot terminate the declaration. A quoted alternative additionally
 * refuses `<>=;`, which is what keeps `style="font-family: Inter"><span
 * style="font-family: Lora"` from being read as one enormous value that spans
 * both tags — the closing quote of the first attribute would otherwise pair with
 * the opening quote of the second.
 *
 * `&quot;` appears because a double-quoted family inside a double-quoted
 * attribute is escaped by every HTML serialiser we round-trip through.
 */
const FONT_FAMILY_DECLARATION =
  /font-family\s*:\s*((?:&quot;[^&<>=;]*&quot;|"[^"<>=;]*"|'[^'<>=;]*'|[^;"'>])+)/gi;

/** Generic CSS families and variable fallbacks never need loading. */
const GENERIC = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
  "ui-rounded",
  "inherit",
  "initial",
  "unset",
  "revert",
]);

/** `&quot;Playfair Display&quot;, serif` → `Playfair Display` */
function headFamily(stack: string): string | null {
  const head = stack.split(",")[0]?.trim() ?? "";
  const decoded = head.replace(/&quot;|&#34;/gi, '"').replace(/&apos;|&#39;/gi, "'");
  const unquoted = decoded.replace(/^["']|["']$/g, "").trim();
  if (!unquoted) return null;
  if (unquoted.startsWith("var(")) return null;
  if (GENERIC.has(unquoted.toLowerCase())) return null;
  // A family name is letters, digits, spaces and hyphens. Anything else is
  // either a CSS function or something we should not be echoing into a URL.
  if (!/^[\w][\w \-.]{0,63}$/.test(unquoted)) return null;
  return unquoted;
}

/** Distinct families referenced by inline `font-family` declarations. */
export function extractFontFamilies(html: string | null | undefined): string[] {
  if (!html) return [];
  const found = new Set<string>();
  for (const match of html.matchAll(FONT_FAMILY_DECLARATION)) {
    const family = headFamily(match[1] ?? "");
    if (family) found.add(family);
  }
  return [...found].sort((a, b) => a.localeCompare(b));
}
