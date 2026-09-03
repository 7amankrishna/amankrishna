"use client";

import type { Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TextAlign from "@tiptap/extension-text-align";
import {
  BackgroundColor,
  Color,
  FontFamily,
  FontSize,
  TextStyle,
} from "@tiptap/extension-text-style";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import { ALLOWED_PROTOCOLS, isSafeUrl } from "@/lib/content/schema";
import { BlockStyle } from "@/lib/editor/extensions/block-style";
import { Figure } from "@/lib/editor/extensions/figure";

/**
 * The editor's extension set.
 *
 * Two principles:
 *   1. **Only what the sanitiser allows.** Every extension here maps onto tags,
 *      attributes and CSS declarations in `lib/content/schema.ts`, so nothing
 *      the author can type will silently disappear on publish.
 *   2. **Reuse before writing.** Everything except block spacing and the figure
 *      node comes from TipTap; those two exist because the shipped versions put
 *      inline styles where block styles belong (see `block-style.ts`).
 */

export function buildExtensions(options?: {
  placeholder?: string;
}): Extensions {
  return [
    StarterKit.configure({
      // The article's H1 is the post title, so the body starts at H2.
      heading: { levels: [2, 3, 4, 5, 6] },
      codeBlock: {
        HTMLAttributes: { class: "not-prose" },
        languageClassPrefix: "language-",
      },
      link: {
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        defaultProtocol: "https",
        protocols: [...ALLOWED_PROTOCOLS],
        // Belt and braces with the sanitiser: refuse the mark outright rather
        // than creating an anchor that gets downgraded to a <span> on publish.
        isAllowedUri: (url, ctx) => ctx.defaultValidate(url) && isSafeUrl(url),
        shouldAutoLink: (url) => isSafeUrl(url),
        HTMLAttributes: { rel: "noopener noreferrer", target: null },
      },
      // A trailing paragraph after a figure/code block, so there is always
      // somewhere to click and keep typing.
      trailingNode: {},
    }),

    // Inline formatting the StarterKit leaves out.
    Highlight.configure({ multicolor: true }),
    Subscript,
    Superscript,

    // Typography. TextStyle is the carrier mark the next four write into.
    TextStyle,
    FontFamily.configure({ types: ["textStyle"] }),
    FontSize.configure({ types: ["textStyle"] }),
    Color.configure({ types: ["textStyle"] }),
    BackgroundColor.configure({ types: ["textStyle"] }),

    TextAlign.configure({
      types: ["heading", "paragraph"],
      alignments: ["left", "center", "right", "justify"],
    }),

    // Block-level leading, tracking and paragraph spacing.
    BlockStyle,

    // Lists. Bullet/ordered/nesting come from StarterKit; task lists do not.
    TaskList,
    TaskItem.configure({ nested: true }),

    // Images: `Figure` for anything inserted from now on, `Image` so bare <img>
    // tags in existing posts still parse instead of being dropped.
    Figure,
    Image.configure({
      inline: false,
      allowBase64: false,
      HTMLAttributes: { loading: "lazy", decoding: "async" },
    }),

    CharacterCount,
    Placeholder.configure({
      placeholder: options?.placeholder ?? "Write your article…",
      showOnlyWhenEditable: true,
    }),
  ];
}
