import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { isSafeUrl, ALLOWED_REL_TOKENS } from "@/lib/content/schema";
import { FigureView } from "@/lib/editor/extensions/figure-view";

/**
 * `<figure>` + `<img>` + `<figcaption>`, the semantic way to publish an image
 * with a caption.
 *
 * The node holds the image's attributes and its *content* is the caption, so
 * the caption is editable rich text rather than a second input field to keep in
 * sync. Width, alignment and an optional wrapping link are attributes too,
 * which means everything round-trips through the sanitiser: `figure` and `img`
 * both allow `style`, and `text-align` / `width` are in the CSS allow-list.
 *
 * Legacy posts store bare `<img>` tags; those are parsed by
 * `@tiptap/extension-image` and left alone, so nothing existing breaks.
 */

export type FigureAlign = "left" | "center" | "right";

export interface FigureOptions {
  HTMLAttributes: Record<string, string>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    figure: {
      /** Insert a figure at the selection. */
      setFigure: (attributes: {
        src: string;
        alt?: string | null;
        title?: string | null;
        caption?: string;
        width?: string | null;
        align?: FigureAlign;
        href?: string | null;
        target?: string | null;
        rel?: string | null;
      }) => ReturnType;
      /** Update the currently selected figure. */
      updateFigure: (attributes: Record<string, unknown>) => ReturnType;
      /** Promote a plain `<img>` (legacy content) into a figure. */
      imageToFigure: () => ReturnType;
    };
  }
}

const ALIGNMENTS: FigureAlign[] = ["left", "center", "right"];

function normalizeAlign(value: unknown): FigureAlign {
  return ALIGNMENTS.includes(value as FigureAlign)
    ? (value as FigureAlign)
    : "center";
}

/** Accept `50%`, `480px` or nothing. Anything else is dropped. */
function normalizeWidth(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const width = value.trim();
  return /^\d{1,4}(\.\d{1,2})?(px|%)$/.test(width) ? width : null;
}

/** Keep only rel tokens the allow-list knows, de-duplicated and ordered. */
function normalizeRel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const tokens = value
    .toLowerCase()
    .split(/\s+/)
    .filter((token): token is (typeof ALLOWED_REL_TOKENS)[number] =>
      (ALLOWED_REL_TOKENS as readonly string[]).includes(token),
    );
  return tokens.length ? [...new Set(tokens)].join(" ") : null;
}

export const Figure = Node.create<FigureOptions>({
  name: "figure",

  group: "block",
  content: "inline*",
  draggable: true,
  isolating: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) =>
          element.querySelector("img")?.getAttribute("src") ?? null,
      },
      alt: {
        default: "",
        parseHTML: (element) =>
          element.querySelector("img")?.getAttribute("alt") ?? "",
      },
      title: {
        default: null,
        parseHTML: (element) =>
          element.querySelector("img")?.getAttribute("title") ?? null,
      },
      width: {
        default: null,
        parseHTML: (element) => {
          const img = element.querySelector("img");
          return normalizeWidth(img?.style.width ?? img?.getAttribute("width"));
        },
      },
      align: {
        default: "center",
        parseHTML: (element) => normalizeAlign(element.style.textAlign),
      },
      href: {
        default: null,
        parseHTML: (element) =>
          element.querySelector("a")?.getAttribute("href") ?? null,
      },
      target: {
        default: null,
        parseHTML: (element) =>
          element.querySelector("a")?.getAttribute("target") ?? null,
      },
      rel: {
        default: null,
        parseHTML: (element) =>
          normalizeRel(element.querySelector("a")?.getAttribute("rel")),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure",
        // Only claim figures that actually wrap an image; anything else stays
        // untouched so we never swallow unrelated markup.
        getAttrs: (element) => (element.querySelector("img") ? {} : false),
        // The caption is the node's content. A figure without a figcaption gets
        // an empty stand-in so the parser has something to walk.
        contentElement: (element) => {
          const caption = element.querySelector("figcaption");
          if (caption) return caption;
          return element.ownerDocument.createElement("figcaption");
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const align = normalizeAlign(node.attrs.align);
    const width = normalizeWidth(node.attrs.width);
    const src = typeof node.attrs.src === "string" ? node.attrs.src : "";
    const href = typeof node.attrs.href === "string" ? node.attrs.href : "";

    const imageAttributes: Record<string, string> = {
      src,
      alt: typeof node.attrs.alt === "string" ? node.attrs.alt : "",
      loading: "lazy",
      decoding: "async",
    };
    if (typeof node.attrs.title === "string" && node.attrs.title)
      imageAttributes.title = node.attrs.title;
    if (width) imageAttributes.style = `width: ${width}`;

    const image = ["img", imageAttributes];

    // The sanitiser re-checks this, but refusing to emit an unsafe href at all
    // means the editor's own preview matches what gets published.
    const rel = normalizeRel(node.attrs.rel);
    const target = node.attrs.target === "_blank" ? "_blank" : null;
    const linkAttributes: Record<string, string> = { href };
    if (target) {
      linkAttributes.target = target;
      // A new-tab link always gets noopener/noreferrer.
      linkAttributes.rel =
        normalizeRel(`${rel ?? ""} noopener noreferrer`) ?? "noopener noreferrer";
    } else if (rel) {
      linkAttributes.rel = rel;
    }

    const inner =
      href && isSafeUrl(href) ? ["a", linkAttributes, image] : image;

    return [
      "figure",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "figure",
        style: `text-align: ${align}`,
      }),
      inner,
      ["figcaption", {}, 0],
    ];
  },

  addCommands() {
    return {
      setFigure:
        ({ caption, ...attributes }) =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              attrs: {
                ...attributes,
                align: normalizeAlign(attributes.align),
                width: normalizeWidth(attributes.width),
                rel: normalizeRel(attributes.rel),
              },
              content: caption?.trim()
                ? [{ type: "text", text: caption.trim() }]
                : [],
            })
            .run(),

      updateFigure:
        (attributes) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, attributes),

      imageToFigure:
        () =>
        ({ state, chain }) => {
          const node = state.selection.$anchor.nodeAfter;
          if (!node || node.type.name !== "image") return false;

          return chain()
            .deleteSelection()
            .insertContent({
              type: this.name,
              attrs: {
                src: node.attrs.src,
                alt: node.attrs.alt ?? "",
                title: node.attrs.title ?? null,
              },
              content: [],
            })
            .run();
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(FigureView);
  },
});

export default Figure;
