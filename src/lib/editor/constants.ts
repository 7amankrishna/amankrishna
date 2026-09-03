/** Values the editor's typography controls offer. Shared by toolbar and menus. */

/** Font sizes in px, 12–64 as the brief asks, plus a free-text custom entry. */
export const FONT_SIZES = [
  12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64,
] as const;

export const DEFAULT_FONT_SIZE = 16;

/** Line height is unitless so it scales with whatever font size is in play. */
export const LINE_HEIGHTS = [
  { label: "Tight", value: "1.2" },
  { label: "Snug", value: "1.4" },
  { label: "Normal", value: "1.6" },
  { label: "Relaxed", value: "1.8" },
  { label: "Loose", value: "2" },
] as const;

export const LETTER_SPACINGS = [
  { label: "Tighter", value: "-0.02em" },
  { label: "Tight", value: "-0.01em" },
  { label: "Normal", value: "normal" },
  { label: "Wide", value: "0.02em" },
  { label: "Wider", value: "0.05em" },
] as const;

/** Space after a block, i.e. `margin-bottom`. */
export const PARAGRAPH_SPACINGS = [
  { label: "None", value: "0" },
  { label: "Small", value: "0.5rem" },
  { label: "Default", value: "1rem" },
  { label: "Medium", value: "1.5rem" },
  { label: "Large", value: "2rem" },
] as const;

/** Languages offered for a code block, matching the `language-x` class allow-list. */
export const CODE_LANGUAGES = [
  "plaintext",
  "bash",
  "css",
  "html",
  "json",
  "javascript",
  "typescript",
  "jsx",
  "tsx",
  "python",
  "sql",
  "yaml",
] as const;

/** Highlight swatches, drawn from the site palette so notes stay on-brand. */
export const HIGHLIGHT_COLORS = [
  { label: "Violet", value: "rgba(124, 92, 255, 0.28)" },
  { label: "Cyan", value: "rgba(34, 211, 238, 0.24)" },
  { label: "Blue", value: "rgba(77, 124, 254, 0.24)" },
  { label: "Amber", value: "rgba(245, 158, 11, 0.28)" },
  { label: "Rose", value: "rgba(244, 63, 94, 0.24)" },
] as const;

/** Text colours. Kept small and legible on both themes. */
export const TEXT_COLORS = [
  { label: "Default", value: null },
  { label: "Muted", value: "#8f8f98" },
  { label: "Violet", value: "#7c5cff" },
  { label: "Blue", value: "#4d7cfe" },
  { label: "Cyan", value: "#22d3ee" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Rose", value: "#f43f5e" },
] as const;
