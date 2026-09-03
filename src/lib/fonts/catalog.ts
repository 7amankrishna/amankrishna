/**
 * Offline catalogue of popular Google Fonts.
 *
 * The Google Fonts Developer API needs an API key (`GOOGLE_FONTS_API_KEY`).
 * When one is configured the font browser searches the live catalogue; when it
 * is not, it searches this list instead — so adding fonts works out of the box
 * and the feature never hard-depends on an external credential.
 *
 * Weights are the real static weights each family ships, so the weight
 * dropdown only ever offers something that will actually render.
 */

export type CatalogEntry = {
  family: string;
  /** Google's own category, used for a sensible CSS fallback. */
  category: "sans-serif" | "serif" | "display" | "handwriting" | "monospace";
  weights: number[];
  italic: boolean;
};

export const GOOGLE_FONT_CATALOG: CatalogEntry[] = [
  { family: "Inter", category: "sans-serif", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], italic: true },
  { family: "Roboto", category: "sans-serif", weights: [100, 300, 400, 500, 700, 900], italic: true },
  { family: "Open Sans", category: "sans-serif", weights: [300, 400, 500, 600, 700, 800], italic: true },
  { family: "Montserrat", category: "sans-serif", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], italic: true },
  { family: "Lato", category: "sans-serif", weights: [100, 300, 400, 700, 900], italic: true },
  { family: "Poppins", category: "sans-serif", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], italic: true },
  { family: "Nunito", category: "sans-serif", weights: [200, 300, 400, 500, 600, 700, 800, 900, 1000], italic: true },
  { family: "Nunito Sans", category: "sans-serif", weights: [200, 300, 400, 500, 600, 700, 800, 900, 1000], italic: true },
  { family: "Work Sans", category: "sans-serif", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], italic: true },
  { family: "DM Sans", category: "sans-serif", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000], italic: true },
  { family: "Manrope", category: "sans-serif", weights: [200, 300, 400, 500, 600, 700, 800], italic: false },
  { family: "Outfit", category: "sans-serif", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], italic: false },
  { family: "Plus Jakarta Sans", category: "sans-serif", weights: [200, 300, 400, 500, 600, 700, 800], italic: true },
  { family: "Figtree", category: "sans-serif", weights: [300, 400, 500, 600, 700, 800, 900], italic: true },
  { family: "Sora", category: "sans-serif", weights: [100, 200, 300, 400, 500, 600, 700, 800], italic: false },
  { family: "Space Grotesk", category: "sans-serif", weights: [300, 400, 500, 600, 700], italic: false },
  { family: "Raleway", category: "sans-serif", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], italic: true },
  { family: "Rubik", category: "sans-serif", weights: [300, 400, 500, 600, 700, 800, 900], italic: true },
  { family: "Karla", category: "sans-serif", weights: [200, 300, 400, 500, 600, 700, 800], italic: true },
  { family: "Mulish", category: "sans-serif", weights: [200, 300, 400, 500, 600, 700, 800, 900, 1000], italic: true },
  { family: "Barlow", category: "sans-serif", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], italic: true },
  { family: "Source Sans 3", category: "sans-serif", weights: [200, 300, 400, 500, 600, 700, 800, 900], italic: true },
  { family: "IBM Plex Sans", category: "sans-serif", weights: [100, 200, 300, 400, 500, 600, 700], italic: true },
  { family: "Public Sans", category: "sans-serif", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], italic: true },
  { family: "Archivo", category: "sans-serif", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], italic: true },
  { family: "Lexend", category: "sans-serif", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], italic: false },
  { family: "Onest", category: "sans-serif", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], italic: false },
  { family: "Geist", category: "sans-serif", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], italic: false },

  { family: "Merriweather", category: "serif", weights: [300, 400, 500, 600, 700, 800, 900], italic: true },
  { family: "Playfair Display", category: "serif", weights: [400, 500, 600, 700, 800, 900], italic: true },
  { family: "Lora", category: "serif", weights: [400, 500, 600, 700], italic: true },
  { family: "Source Serif 4", category: "serif", weights: [200, 300, 400, 500, 600, 700, 800, 900], italic: true },
  { family: "PT Serif", category: "serif", weights: [400, 700], italic: true },
  { family: "Crimson Pro", category: "serif", weights: [200, 300, 400, 500, 600, 700, 800, 900], italic: true },
  { family: "Libre Baskerville", category: "serif", weights: [400, 700], italic: true },
  { family: "EB Garamond", category: "serif", weights: [400, 500, 600, 700, 800], italic: true },
  { family: "Bitter", category: "serif", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], italic: true },
  { family: "Newsreader", category: "serif", weights: [200, 300, 400, 500, 600, 700, 800], italic: true },
  { family: "Fraunces", category: "serif", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], italic: true },
  { family: "Instrument Serif", category: "serif", weights: [400], italic: true },
  { family: "DM Serif Display", category: "serif", weights: [400], italic: true },
  { family: "Spectral", category: "serif", weights: [200, 300, 400, 500, 600, 700, 800], italic: true },
  { family: "Cormorant Garamond", category: "serif", weights: [300, 400, 500, 600, 700], italic: true },

  { family: "Oswald", category: "display", weights: [200, 300, 400, 500, 600, 700], italic: false },
  { family: "Bebas Neue", category: "display", weights: [400], italic: false },
  { family: "Anton", category: "display", weights: [400], italic: false },
  { family: "Syne", category: "display", weights: [400, 500, 600, 700, 800], italic: false },
  { family: "Unbounded", category: "display", weights: [200, 300, 400, 500, 600, 700, 800, 900], italic: false },
  { family: "Chivo", category: "display", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], italic: true },

  { family: "JetBrains Mono", category: "monospace", weights: [100, 200, 300, 400, 500, 600, 700, 800], italic: true },
  { family: "Fira Code", category: "monospace", weights: [300, 400, 500, 600, 700], italic: false },
  { family: "IBM Plex Mono", category: "monospace", weights: [100, 200, 300, 400, 500, 600, 700], italic: true },
  { family: "Source Code Pro", category: "monospace", weights: [200, 300, 400, 500, 600, 700, 800, 900], italic: true },
  { family: "Space Mono", category: "monospace", weights: [400, 700], italic: true },
  { family: "Geist Mono", category: "monospace", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], italic: false },
  { family: "Roboto Mono", category: "monospace", weights: [100, 200, 300, 400, 500, 600, 700], italic: true },

  { family: "Caveat", category: "handwriting", weights: [400, 500, 600, 700], italic: false },
  { family: "Dancing Script", category: "handwriting", weights: [400, 500, 600, 700], italic: false },
  { family: "Kalam", category: "handwriting", weights: [300, 400, 700], italic: false },
];

/** CSS fallback stack for a Google category. */
export function fallbackFor(category: CatalogEntry["category"]): string {
  switch (category) {
    case "serif":
      return "Georgia, Cambria, serif";
    case "monospace":
      return "ui-monospace, SFMono-Regular, monospace";
    case "handwriting":
      return "cursive";
    case "display":
    case "sans-serif":
    default:
      return "ui-sans-serif, system-ui, sans-serif";
  }
}

/** Case-insensitive substring search over the offline catalogue. */
export function searchCatalog(query: string, limit = 24): CatalogEntry[] {
  const q = query.trim().toLowerCase();
  const pool = q
    ? GOOGLE_FONT_CATALOG.filter((f) => f.family.toLowerCase().includes(q))
    : GOOGLE_FONT_CATALOG;
  return pool.slice(0, limit);
}
