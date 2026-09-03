import { Extension } from "@tiptap/core";

/**
 * Block-level typography: line height, letter spacing and paragraph spacing.
 *
 * Why not `@tiptap/extension-text-style`'s `LineHeight`? That one hardcodes
 * `setMark("textStyle", …)`, so it wraps the selection in a `<span>`. Leading is
 * a property of the block box — a span with `line-height` inside a paragraph
 * does not reliably change how that paragraph breaks. So these attributes go on
 * the block nodes themselves, which is also what the published HTML needs for
 * the styles to survive sanitisation (`p`, `h1`–`h6` and `blockquote` all allow
 * `style`, and `line-height` / `letter-spacing` / `margin-bottom` are all in the
 * allow-list).
 */

export type BlockStyleAttributes = {
  lineHeight?: string | null;
  letterSpacing?: string | null;
  marginBottom?: string | null;
};

export type BlockStyleOptions = {
  /** Node names that carry these attributes. */
  types: string[];
};

/**
 * Default set of nodes that carry block typography. Exported so the toolbar can
 * walk the selection for the *current* values without duplicating the list.
 */
export const BLOCK_STYLE_TYPES = [
  "paragraph",
  "heading",
  "blockquote",
  "codeBlock",
  "figure",
] as const;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    blockStyle: {
      /** Apply spacing to every block touched by the selection. */
      setBlockStyle: (attributes: BlockStyleAttributes) => ReturnType;
      /** Clear all three, returning the block to the stylesheet default. */
      unsetBlockStyle: () => ReturnType;
    };
  }
}

/** Read one declaration off an element, normalising "" to null. */
function styleValue(element: HTMLElement, property: string): string | null {
  const value = element.style.getPropertyValue(property).trim();
  return value || null;
}

export const BlockStyle = Extension.create<BlockStyleOptions>({
  name: "blockStyle",

  addOptions() {
    return {
      types: [...BLOCK_STYLE_TYPES],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => styleValue(element, "line-height"),
            renderHTML: (attributes) =>
              attributes.lineHeight
                ? { style: `line-height: ${attributes.lineHeight}` }
                : {},
          },
          letterSpacing: {
            default: null,
            parseHTML: (element) => styleValue(element, "letter-spacing"),
            renderHTML: (attributes) =>
              attributes.letterSpacing
                ? { style: `letter-spacing: ${attributes.letterSpacing}` }
                : {},
          },
          marginBottom: {
            default: null,
            parseHTML: (element) => styleValue(element, "margin-bottom"),
            renderHTML: (attributes) =>
              attributes.marginBottom
                ? { style: `margin-bottom: ${attributes.marginBottom}` }
                : {},
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setBlockStyle:
        (attributes) =>
        ({ state, tr, dispatch }) => {
          const { from, to } = state.selection;
          let touched = false;

          state.doc.nodesBetween(from, to, (node, pos) => {
            if (!this.options.types.includes(node.type.name)) return;
            // setNodeMarkup keeps the node's size, so positions collected from
            // `state.doc` stay valid across the whole walk.
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attributes });
            touched = true;
          });

          if (!touched) return false;
          if (dispatch) dispatch(tr);
          return true;
        },

      unsetBlockStyle:
        () =>
        ({ commands }) =>
          commands.setBlockStyle({
            lineHeight: null,
            letterSpacing: null,
            marginBottom: null,
          }),
    };
  },
});

export default BlockStyle;
