/** Font library types shared by the editor, the loader and the API route. */

export type FontSource = "system" | "google" | "custom";

/** A row of `public.site_fonts`, plus the built-in system entries. */
export type SiteFont = {
  id: string;
  family: string;
  source: FontSource;
  /** Numeric CSS weights known to exist for this family. */
  weights: number[];
  style: "normal" | "italic";
  /** Custom fonts only: absolute https URL of the file or stylesheet. */
  url: string | null;
  /** CSS fallback appended after the family name. */
  fallback: string;
};

/** Weight labels shown in the editor's weight dropdown. */
export const WEIGHT_LABELS: Record<number, string> = {
  100: "Thin",
  200: "Extra Light",
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "Semi Bold",
  700: "Bold",
  800: "Extra Bold",
  900: "Black",
};

/** The weights the toolbar offers, in the order the brief asked for. */
export const OFFERED_WEIGHTS = [300, 400, 500, 600, 700, 800] as const;

/**
 * Always-available families that need no network request at all: the site's own
 * Geist faces plus the standard OS stacks. These are the safe default because
 * they cost zero bytes.
 */
export const SYSTEM_FONTS: SiteFont[] = [
  {
    id: "system-sans",
    family: "Geist Sans",
    source: "system",
    weights: [300, 400, 500, 600, 700, 800],
    style: "normal",
    url: null,
    fallback: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: "system-mono",
    family: "Geist Mono",
    source: "system",
    weights: [400, 500, 600, 700],
    style: "normal",
    url: null,
    fallback: "var(--font-geist-mono), ui-monospace, monospace",
  },
  {
    id: "system-ui",
    family: "System UI",
    source: "system",
    weights: [300, 400, 500, 600, 700],
    style: "normal",
    url: null,
    fallback: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  },
  {
    id: "system-serif",
    family: "Georgia",
    source: "system",
    weights: [400, 700],
    style: "normal",
    url: null,
    fallback: "Cambria, Times New Roman, serif",
  },
  {
    id: "system-slab",
    family: "Times New Roman",
    source: "system",
    weights: [400, 700],
    style: "normal",
    url: null,
    fallback: "Times, serif",
  },
  {
    id: "system-arial",
    family: "Arial",
    source: "system",
    weights: [400, 700],
    style: "normal",
    url: null,
    fallback: "Helvetica, sans-serif",
  },
  {
    id: "system-courier",
    family: "Courier New",
    source: "system",
    weights: [400, 700],
    style: "normal",
    url: null,
    fallback: "Courier, monospace",
  },
];

/** True when a family is one of the zero-cost system entries. */
export function isSystemFamily(family: string): boolean {
  return SYSTEM_FONTS.some((f) => f.family === family);
}

/** Look a family up across system fonts and the DB library. */
export function findFont(
  family: string,
  library: SiteFont[],
): SiteFont | undefined {
  return (
    SYSTEM_FONTS.find((f) => f.family === family) ??
    library.find((f) => f.family === family)
  );
}
