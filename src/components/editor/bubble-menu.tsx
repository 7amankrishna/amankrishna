"use client";

import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { BubbleMenu } from "@tiptap/react/menus";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link2,
  Quote,
  Strikethrough,
  Underline,
} from "lucide-react";
import { HIGHLIGHT_COLORS } from "@/lib/editor/constants";
import { ToolbarButton, ToolbarDivider } from "@/components/editor/primitives";
import type { ToolbarSnapshot } from "@/components/editor/editor-toolbar";

/**
 * Floating menu over the current selection.
 *
 * Kept to the handful of actions worth reaching for mid-sentence — the full
 * toolbar is still sticky at the top, so duplicating 30 controls here would just
 * mean a bubble wider than the selection it points at.
 *
 * Hidden for node selections (an image already has its own controls) and inside
 * code blocks, where inline formatting is meaningless.
 */

export function EditorBubbleMenu({
  editor,
  state,
  onInsertLink,
}: {
  editor: Editor;
  state: ToolbarSnapshot;
  onInsertLink: () => void;
}) {
  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: "top", offset: 8 }}
      shouldShow={({ editor, from, to }) => {
        if (from === to) return false;
        if (editor.isActive("codeBlock")) return false;
        // A selected figure/hr is a node selection: its own UI handles it.
        if (editor.state.selection instanceof NodeSelection) return false;
        return editor.isEditable;
      }}
      className="glass flex items-center gap-0.5 rounded-xl px-1.5 py-1 shadow-2xl"
    >
      <ToolbarButton
        label="Bold"
        shortcut="Ctrl+B"
        active={state.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="size-4" aria-hidden />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        shortcut="Ctrl+I"
        active={state.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="size-4" aria-hidden />
      </ToolbarButton>
      <ToolbarButton
        label="Underline"
        shortcut="Ctrl+U"
        active={state.underline}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline className="size-4" aria-hidden />
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        active={state.strike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="size-4" aria-hidden />
      </ToolbarButton>
      <ToolbarButton
        label="Inline code"
        active={state.code}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code className="size-4" aria-hidden />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        label={state.highlight ? "Remove highlight" : "Highlight"}
        active={state.highlight}
        onClick={() =>
          state.highlight
            ? editor.chain().focus().unsetHighlight().run()
            : editor
                .chain()
                .focus()
                .setHighlight({ color: HIGHLIGHT_COLORS[0].value })
                .run()
        }
      >
        <Highlighter className="size-4" aria-hidden />
      </ToolbarButton>
      <ToolbarButton
        label={state.link ? "Edit link" : "Add link"}
        shortcut="Ctrl+K"
        active={state.link}
        onClick={onInsertLink}
      >
        <Link2 className="size-4" aria-hidden />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        label="Heading 2"
        active={state.block === "h2"}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="size-4" aria-hidden />
      </ToolbarButton>
      <ToolbarButton
        label="Heading 3"
        active={state.block === "h3"}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="size-4" aria-hidden />
      </ToolbarButton>
      <ToolbarButton
        label="Quote"
        active={state.block === "blockquote"}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="size-4" aria-hidden />
      </ToolbarButton>
    </BubbleMenu>
  );
}
