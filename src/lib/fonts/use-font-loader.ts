"use client";

import { useCallback, useEffect } from "react";
import {
  customFontFace,
  FONT_FILE_ORIGIN,
  googleFontsCssUrl,
} from "@/lib/fonts/css";
import type { SiteFont } from "@/lib/fonts/types";

/**
 * On-demand font loading for the editor.
 *
 * The server already ships a stylesheet for every library entry that existed at
 * page load. This hook covers the gap: a font added through the font manager
 * without a reload has to become visible in the picker and the canvas
 * immediately, so we inject it client-side.
 *
 * Injection is idempotent and keyed by family, so re-renders and repeated picks
 * never duplicate a request. Nothing here runs on a public page.
 */

const ATTR = "data-editor-font";

/** Families already injected in this document, so we never request twice. */
const injected = new Set<string>();

function ensurePreconnect() {
  if (document.querySelector(`link[${ATTR}="preconnect"]`)) return;
  const link = document.createElement("link");
  link.rel = "preconnect";
  link.href = FONT_FILE_ORIGIN;
  link.crossOrigin = "anonymous";
  link.setAttribute(ATTR, "preconnect");
  document.head.appendChild(link);
}

/**
 * Make a single family usable right now. Returns silently for system fonts —
 * they need no network at all, which is the whole point of them.
 */
export function loadFont(font: SiteFont): void {
  if (typeof document === "undefined") return;
  if (font.source === "system") return;
  if (injected.has(font.family)) return;
  injected.add(font.family);

  if (font.source === "google") {
    const href = googleFontsCssUrl([
      { family: font.family, weights: font.weights },
    ]);
    if (!href) return;
    ensurePreconnect();

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute(ATTR, font.family);
    document.head.appendChild(link);
    return;
  }

  // Custom: either a stylesheet to link, or a file to wrap in @font-face.
  if (font.url && /\.css(\?|$)/i.test(font.url)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = font.url;
    link.setAttribute(ATTR, font.family);
    document.head.appendChild(link);
    return;
  }

  const face = customFontFace(font);
  if (!face) {
    // Validation rejected it — drop the memo so a corrected row can retry.
    injected.delete(font.family);
    return;
  }

  const style = document.createElement("style");
  style.setAttribute(ATTR, font.family);
  style.textContent = face;
  document.head.appendChild(style);
}

/**
 * Keep a whole library loaded, and hand back a loader for one-off picks.
 *
 * Passing the library keeps the picker's live previews honest: every option in
 * the dropdown renders in its own face rather than in the fallback.
 */
export function useFontLoader(library: SiteFont[]) {
  useEffect(() => {
    for (const font of library) loadFont(font);
  }, [library]);

  return useCallback(
    (family: string) => {
      const font = library.find((f) => f.family === family);
      if (font) loadFont(font);
    },
    [library],
  );
}
