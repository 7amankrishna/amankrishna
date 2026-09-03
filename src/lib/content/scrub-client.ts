"use client";

import {
  ALLOWED_ATTRS,
  ALLOWED_STYLES,
  ALLOWED_TAGS,
  isSafeUrl,
} from "@/lib/content/schema";

/**
 * Browser-side mirror of the server sanitizer, used by the editor's Preview
 * tab. It exists so the preview can never render markup the published page
 * would strip — the two share `schema.ts`, so they cannot drift.
 *
 * This is a second line of defence, not the primary one: TipTap's schema
 * already makes it impossible to author a `<script>` node, and the server
 * sanitizes again before the HTML is stored or rendered publicly.
 */

const TAGS = new Set<string>(ALLOWED_TAGS);

function scrubStyle(value: string): string {
  const kept: string[] = [];
  for (const decl of value.split(";")) {
    const idx = decl.indexOf(":");
    if (idx < 1) continue;
    const prop = decl.slice(0, idx).trim().toLowerCase();
    const val = decl.slice(idx + 1).trim();
    const patterns = ALLOWED_STYLES[prop];
    if (patterns?.some((re) => re.test(val))) kept.push(`${prop}: ${val}`);
  }
  return kept.join("; ");
}

function scrubElement(el: Element) {
  const tag = el.tagName.toLowerCase();

  if (!TAGS.has(tag)) {
    // Unwrap: keep the text, discard the element.
    el.replaceWith(...Array.from(el.childNodes));
    return;
  }

  const allowed = new Set<string>(ALLOWED_ATTRS[tag] ?? []);
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();

    if (!allowed.has(name)) {
      el.removeAttribute(attr.name);
      continue;
    }
    if ((name === "href" || name === "src") && !isSafeUrl(attr.value, { allowDataImage: tag === "img" })) {
      el.removeAttribute(attr.name);
      continue;
    }
    if (name === "style") {
      const clean = scrubStyle(attr.value);
      if (clean) el.setAttribute("style", clean);
      else el.removeAttribute("style");
    }
  }

  if (tag === "a" && el.getAttribute("target") === "_blank") {
    el.setAttribute("rel", "noopener noreferrer");
  }
  if (tag === "input") {
    el.setAttribute("disabled", "disabled");
  }
}

/** Scrub editor HTML for safe preview rendering. Browser-only. */
export function scrubForPreview(html: string): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(
    `<div id="root">${html}</div>`,
    "text/html",
  );
  const root = doc.getElementById("root");
  if (!root) return "";

  // Walk a static snapshot: scrubElement mutates the tree as it unwraps.
  for (const el of Array.from(root.querySelectorAll("*"))) {
    if (el.isConnected) scrubElement(el);
  }
  return root.innerHTML;
}
