/**
 * Shared allow-lists for rich-text content.
 *
 * Isomorphic on purpose: the server sanitizer (`sanitize.ts`, Node-only) and
 * the in-editor preview scrubber (`scrub-client.ts`, browser-only) must agree
 * on exactly what is permitted, so the preview can never show markup the
 * published page would strip.
 */

/** Elements the editor can produce. Anything else is dropped entirely. */
export const ALLOWED_TAGS = [
  "p",
  "br",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "del",
  "mark",
  "sub",
  "sup",
  "code",
  "pre",
  "blockquote",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "hr",
  "span",
  "div",
  "figure",
  "figcaption",
  "label",
  "input",
] as const;

/**
 * Attributes permitted per element.
 *
 * `style` is allowed but every declaration inside it is re-validated against
 * ALLOWED_STYLES below, so it cannot become a CSS injection vector.
 * `data-type` / `data-checked` are what TipTap's task list serializes to.
 */
export const ALLOWED_ATTRS: Record<string, readonly string[]> = {
  a: ["href", "target", "rel", "title"],
  img: ["src", "alt", "title", "width", "height", "loading", "decoding", "style"],
  span: ["style", "data-type"],
  div: ["style", "data-type", "data-checked"],
  li: ["style", "data-type", "data-checked"],
  ul: ["style", "data-type"],
  ol: ["style", "start", "type"],
  p: ["style"],
  h1: ["style"],
  h2: ["style", "id"],
  h3: ["style", "id"],
  h4: ["style", "id"],
  h5: ["style", "id"],
  h6: ["style", "id"],
  blockquote: ["style"],
  pre: ["style"],
  code: ["class", "data-lang"],
  figure: ["style", "data-type"],
  figcaption: ["style"],
  mark: ["style"],
  // Task-list checkboxes render as disabled inputs inside <label>.
  input: ["type", "checked", "disabled"],
  label: [],
};

/**
 * CSS declarations the editor is allowed to set, with a validator per
 * property. A declaration whose value fails its pattern is discarded — the
 * element survives, the rogue declaration does not.
 *
 * Every pattern is anchored and rejects `(`, `;`, `:` and `\`, which blocks
 * `url(...)`, `expression(...)` and declaration smuggling.
 */
export const ALLOWED_STYLES: Record<string, RegExp[]> = {
  // Typography
  "font-family": [/^[-\w\s'",]{1,120}$/],
  "font-size": [/^\d{1,3}(\.\d{1,2})?(px|rem|em|%)$/],
  "font-weight": [/^([1-9]00|normal|bold)$/],
  "font-style": [/^(normal|italic)$/],
  "line-height": [/^\d{1,2}(\.\d{1,3})?$/, /^\d{1,3}(\.\d{1,2})?(px|rem|em|%)$/],
  "letter-spacing": [/^-?\d{1,2}(\.\d{1,3})?(px|rem|em)$/, /^normal$/],
  "text-align": [/^(left|right|center|justify|start|end)$/],
  "text-decoration": [/^(none|underline|line-through)$/],
  "text-transform": [/^(none|uppercase|lowercase|capitalize)$/],
  // Colours — hex, rgb(a) and hsl(a) need parens, so they get their own
  // tightly-bounded patterns instead of the generic no-paren rule.
  color: [
    /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i,
    /^rgba?\(\s*[\d.]{1,6}\s*,\s*[\d.]{1,6}\s*,\s*[\d.]{1,6}\s*(?:,\s*[\d.]{1,5}\s*)?\)$/,
    /^hsla?\(\s*[\d.]{1,6}\s*,\s*[\d.]{1,6}%\s*,\s*[\d.]{1,6}%\s*(?:,\s*[\d.]{1,5}\s*)?\)$/,
  ],
  "background-color": [
    /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i,
    /^rgba?\(\s*[\d.]{1,6}\s*,\s*[\d.]{1,6}\s*,\s*[\d.]{1,6}\s*(?:,\s*[\d.]{1,5}\s*)?\)$/,
    /^hsla?\(\s*[\d.]{1,6}\s*,\s*[\d.]{1,6}%\s*,\s*[\d.]{1,6}%\s*(?:,\s*[\d.]{1,5}\s*)?\)$/,
    /^transparent$/,
  ],
  // Paragraph spacing
  "margin-top": [/^-?\d{1,3}(\.\d{1,2})?(px|rem|em)$/, /^0$/],
  "margin-bottom": [/^-?\d{1,3}(\.\d{1,2})?(px|rem|em)$/, /^0$/],
  // Image sizing / alignment
  width: [/^\d{1,4}(\.\d{1,2})?(px|%)$/, /^auto$/],
  height: [/^\d{1,4}(\.\d{1,2})?(px|%)$/, /^auto$/],
  "max-width": [/^\d{1,4}(\.\d{1,2})?(px|%)$/, /^none$/],
  "margin-left": [/^auto$/, /^0$/],
  "margin-right": [/^auto$/, /^0$/],
  float: [/^(none|left|right)$/],
  display: [/^(block|inline|inline-block|flex)$/],
};

/** Protocols a link or image may use. `javascript:` is absent by design. */
export const ALLOWED_PROTOCOLS = ["http", "https", "mailto", "tel"] as const;

/** `rel` tokens the link dialog may set. */
export const ALLOWED_REL_TOKENS = [
  "noopener",
  "noreferrer",
  "nofollow",
  "sponsored",
  "ugc",
] as const;

/**
 * True when a URL is safe to put in `href`/`src`.
 *
 * Rejects `javascript:`, `data:` (except inline images), `vbscript:` and any
 * scheme not in ALLOWED_PROTOCOLS. Protocol-relative and site-relative URLs
 * are accepted because they inherit the page's origin.
 */
export function isSafeUrl(value: string, opts?: { allowDataImage?: boolean }): boolean {
  const url = value.trim();
  if (!url) return false;

  // Control characters and whitespace are used to smuggle schemes past naive
  // checks (e.g. a tab inside "java<TAB>script:"). Reject them outright.
  for (let i = 0; i < url.length; i++) {
    const code = url.charCodeAt(i);
    if (code <= 0x20 || code === 0x7f) return false;
  }

  if (opts?.allowDataImage && /^data:image\/(png|jpe?g|gif|webp|avif);base64,[a-z0-9+/=\s]+$/i.test(url))
    return true;

  // Relative, root-relative, hash and protocol-relative URLs are fine.
  if (/^(\/|\.{1,2}\/|#|\?)/.test(url)) return true;
  if (url.startsWith("//")) return true;

  const scheme = url.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
  if (!scheme) return true; // bare path like "blog/post"
  return (ALLOWED_PROTOCOLS as readonly string[]).includes(scheme);
}

/** Font file / stylesheet extensions accepted for a custom font URL. */
export const FONT_URL_PATTERN =
  /^https:\/\/[^\s"'<>]+\.(woff2|woff|ttf|otf|css)(\?[^\s"'<>]*)?$/i;

/**
 * Validate a custom font URL. HTTPS only — a mixed-content font would fail to
 * load anyway — and the path must end in a real font or stylesheet extension
 * so the value cannot be pointed at an HTML page that never resolves.
 */
export function isSafeFontUrl(value: string): boolean {
  const url = value.trim();
  if (!FONT_URL_PATTERN.test(url)) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !!parsed.hostname.includes(".");
  } catch {
    return false;
  }
}
