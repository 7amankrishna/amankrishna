import sanitizeHtml from "sanitize-html";
import {
  ALLOWED_ATTRS,
  ALLOWED_PROTOCOLS,
  ALLOWED_REL_TOKENS,
  ALLOWED_STYLES,
  ALLOWED_TAGS,
  isSafeUrl,
} from "@/lib/content/schema";

/**
 * Server-side HTML sanitizer for article bodies. **Node-only** — never import
 * this from a client component.
 *
 * Applied twice on purpose:
 *   1. in the save action, so the database never holds hostile markup, and
 *   2. in the public renderer, so pre-existing rows are safe too.
 *
 * Anything not explicitly allowed by `schema.ts` is removed. `script`,
 * `iframe`, `object`, `embed`, `form`, `style` and every `on*` handler are
 * dropped because they simply are not on the allow-list.
 */

/** sanitize-html wants `Record<string, RegExp[]>` per tag, not per document. */
const styleAllowList: sanitizeHtml.IOptions["allowedStyles"] = {
  "*": ALLOWED_STYLES,
};

const options: sanitizeHtml.IOptions = {
  allowedTags: [...ALLOWED_TAGS],
  allowedAttributes: ALLOWED_ATTRS as Record<string, string[]>,
  allowedStyles: styleAllowList,
  allowedSchemes: [...ALLOWED_PROTOCOLS],
  allowedSchemesByTag: {
    // Inline data-URI images are permitted so a pasted screenshot survives.
    img: [...ALLOWED_PROTOCOLS, "data"],
  },
  allowProtocolRelative: true,
  // Keep the text of a stripped tag (e.g. an unwrapped <font>), drop the tag.
  nonTextTags: ["script", "style", "textarea", "option", "noscript"],
  // `class` is only allowed on <code> for language hints; scrub anything else.
  allowedClasses: {
    code: [/^language-[\w+-]{1,20}$/],
  },
  transformTags: {
    a: (tagName, attribs) => {
      const href = attribs.href ?? "";
      if (!href || !isSafeUrl(href)) {
        // Unsafe href: keep the text, lose the link.
        return { tagName: "span", attribs: {} };
      }

      const rel = new Set(
        (attribs.rel ?? "")
          .split(/\s+/)
          .filter((t) => (ALLOWED_REL_TOKENS as readonly string[]).includes(t)),
      );

      const out: Record<string, string> = { href };
      if (attribs.title) out.title = attribs.title;

      if (attribs.target === "_blank") {
        out.target = "_blank";
        // Reverse-tabnabbing protection is not optional.
        rel.add("noopener");
        rel.add("noreferrer");
      }
      if (rel.size) out.rel = [...rel].join(" ");

      return { tagName, attribs: out };
    },

    img: (tagName, attribs) => {
      const src = attribs.src ?? "";
      if (!src || !isSafeUrl(src, { allowDataImage: true })) {
        // No usable source — drop the element by emptying it out.
        return { tagName: "span", attribs: {} };
      }
      const out: Record<string, string> = {
        src,
        // Empty alt is valid (decorative); a missing attribute is not.
        alt: attribs.alt ?? "",
        loading: "lazy",
        decoding: "async",
      };
      for (const key of ["title", "width", "height", "style"] as const) {
        if (attribs[key]) out[key] = attribs[key];
      }
      return { tagName, attribs: out };
    },

    // Task-list checkboxes must never be interactive on a published page.
    input: (tagName, attribs) => ({
      tagName,
      attribs: {
        type: "checkbox",
        disabled: "disabled",
        ...(attribs.checked !== undefined ? { checked: "checked" } : {}),
      },
    }),
  },
};

/** Sanitize an article body. Returns "" for empty/whitespace-only input. */
export function sanitizeArticleHtml(dirty: string | null | undefined): string {
  if (!dirty) return "";
  const clean = sanitizeHtml(dirty, options).trim();
  // TipTap serializes an empty document as a single blank paragraph.
  return clean === "<p></p>" || clean === "<p><br /></p>" ? "" : clean;
}

/**
 * Strip all markup, collapse whitespace and decode entities — used for word
 * counts, reading time and auto-generated excerpts/meta descriptions.
 */
export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return "";
  const withBreaks = html
    .replace(/<\/(p|h[1-6]|li|blockquote|pre|div|figcaption)>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ");
  return sanitizeHtml(withBreaks, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
