"use client";

import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Baseline,
  Bold,
  Code,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Highlighter,
  ImagePlus,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  RemoveFormatting,
  SquareCode,
  Strikethrough,
  Subscript,
  Superscript,
  Underline,
  Undo2,
} from "lucide-react";
import { BLOCK_STYLE_TYPES } from "@/lib/editor/extensions/block-style";
import { HIGHLIGHT_COLORS, TEXT_COLORS } from "@/lib/editor/constants";
import type { SiteFont } from "@/lib/fonts/types";
import {
  Dropdown,
  DropdownItem,
  DropdownLabel,
  ToolbarButton,
  ToolbarDivider,
  ToolbarGroup,
} from "@/components/editor/primitives";
import { FontFamilySelect, FontSizeSelect } from "@/components/editor/font-controls";
import {
  LetterSpacingSelect,
  LineHeightSelect,
  ParagraphSpacingSelect,
} from "@/components/editor/spacing-controls";
import { cn } from "@/lib/utils";

/**
 * The article toolbar.
 *
 * One `useEditorState` subscription produces a single snapshot per transaction,
 * and every control reads its active state from that object. The alternative —
 * each button calling `editor.isActive(...)` in its own render — re-runs ~30
 * ProseMirror queries on every keystroke and forces a re-render of the whole
 * toolbar anyway, so this is both less work and less code.
 *
 * Heading levels start at 2 on purpose: the article title is the page's only
 * `<h1>`, so letting an author add a second one inside the body would produce a
 * document that reads as two competing pages to a crawler.
 */

/* --------------------------------------------------------------- snapshot -- */

export type ToolbarSnapshot = {
  canUndo: boolean;
  canRedo: boolean;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  code: boolean;
  highlight: boolean;
  subscript: boolean;
  superscript: boolean;
  link: boolean;
  fontFamily: string | null;
  fontSize: string | null;
  color: string | null;
  highlight_color: string | null;
  block: BlockKind;
  align: "left" | "center" | "right" | "justify";
  lineHeight: string | null;
  letterSpacing: string | null;
  marginBottom: string | null;
  bulletList: boolean;
  orderedList: boolean;
  taskList: boolean;
  canIndent: boolean;
  canOutdent: boolean;
};

type BlockKind = "paragraph" | "blockquote" | "codeBlock" | "h2" | "h3" | "h4" | "h5" | "h6";

const HEADING_LEVELS = [2, 3, 4, 5, 6] as const;

/** Narrow an unknown attribute to a non-empty string, or null. */
function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

/**
 * Block typography lives on the node, so read it off the innermost ancestor
 * that actually carries the attributes rather than guessing a node name.
 */
function blockSpacing(editor: Editor) {
  const { $from } = editor.state.selection;
  const names: readonly string[] = BLOCK_STYLE_TYPES;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (!names.includes(node.type.name)) continue;
    return {
      lineHeight: str(node.attrs.lineHeight),
      letterSpacing: str(node.attrs.letterSpacing),
      marginBottom: str(node.attrs.marginBottom),
    };
  }
  return { lineHeight: null, letterSpacing: null, marginBottom: null };
}

function activeBlock(editor: Editor): BlockKind {
  if (editor.isActive("codeBlock")) return "codeBlock";
  if (editor.isActive("blockquote")) return "blockquote";
  const level = HEADING_LEVELS.find((l) => editor.isActive("heading", { level: l }));
  return level ? (`h${level}` as BlockKind) : "paragraph";
}

export function useToolbarSnapshot(editor: Editor): ToolbarSnapshot {
  return useEditorState({
    editor,
    selector: ({ editor }) => {
      const textStyle = editor.getAttributes("textStyle");
      const spacing = blockSpacing(editor);
      const can = editor.can();
      return {
        canUndo: can.undo(),
        canRedo: can.redo(),
        bold: editor.isActive("bold"),
        italic: editor.isActive("italic"),
        underline: editor.isActive("underline"),
        strike: editor.isActive("strike"),
        code: editor.isActive("code"),
        highlight: editor.isActive("highlight"),
        subscript: editor.isActive("subscript"),
        superscript: editor.isActive("superscript"),
        link: editor.isActive("link"),
        fontFamily: str(textStyle.fontFamily),
        fontSize: str(textStyle.fontSize),
        color: str(textStyle.color),
        highlight_color: str(editor.getAttributes("highlight").color),
        block: activeBlock(editor),
        align:
          (["center", "right", "justify"] as const).find((a) =>
            editor.isActive({ textAlign: a }),
          ) ?? "left",
        ...spacing,
        bulletList: editor.isActive("bulletList"),
        orderedList: editor.isActive("orderedList"),
        taskList: editor.isActive("taskList"),
        canIndent: can.sinkListItem("listItem") || can.sinkListItem("taskItem"),
        canOutdent: can.liftListItem("listItem") || can.liftListItem("taskItem"),
      };
    },
  });
}

/* ------------------------------------------------------------ block picker -- */

const BLOCKS: {
  kind: BlockKind;
  label: string;
  Icon: typeof Pilcrow;
  hint?: string;
  apply: (editor: Editor) => void;
}[] = [
  {
    kind: "paragraph",
    label: "Paragraph",
    Icon: Pilcrow,
    apply: (e) => e.chain().focus().setParagraph().run(),
  },
  ...HEADING_LEVELS.map((level) => ({
    kind: `h${level}` as BlockKind,
    label: `Heading ${level}`,
    Icon: { 2: Heading2, 3: Heading3, 4: Heading4, 5: Heading5, 6: Heading6 }[level],
    apply: (e: Editor) => e.chain().focus().setNode("heading", { level }).run(),
  })),
  {
    kind: "blockquote",
    label: "Quote",
    Icon: Quote,
    apply: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    kind: "codeBlock",
    label: "Code block",
    Icon: SquareCode,
    hint: "```",
    apply: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
];

function BlockSelect({ editor, current }: { editor: Editor; current: BlockKind }) {
  const active = BLOCKS.find((b) => b.kind === current) ?? BLOCKS[0];
  return (
    <Dropdown
      label="Paragraph style"
      width="15rem"
      trigger={
        <span className="inline-flex items-center gap-1.5">
          <active.Icon className="size-4" aria-hidden />
          <span className="hidden text-xs sm:inline">{active.label}</span>
        </span>
      }
    >
      <DropdownLabel>Block</DropdownLabel>
      {BLOCKS.map(({ kind, label, Icon, hint, apply }) => (
        <DropdownItem key={kind} active={current === kind} onClick={() => apply(editor)}>
          <Icon className="size-4 shrink-0" aria-hidden />
          {label}
          {hint && <span className="ml-auto font-mono text-[11px] text-muted">{hint}</span>}
        </DropdownItem>
      ))}
      <p className="px-2.5 pb-1 pt-2 text-[11px] leading-relaxed text-muted/70">
        The article title is the page’s H1, so body headings start at H2.
      </p>
    </Dropdown>
  );
}

/* ----------------------------------------------------------------- colour -- */

function Swatch({ color }: { color: string | null }) {
  return (
    <span
      aria-hidden
      className="size-3.5 shrink-0 rounded-full border border-white/20"
      style={{ background: color ?? "transparent" }}
    />
  );
}

function ColorSelect({ editor, current }: { editor: Editor; current: string | null }) {
  return (
    <Dropdown
      label="Text colour"
      width="12rem"
      trigger={
        <span className="inline-flex items-center gap-1">
          <Baseline className="size-4" aria-hidden />
          <Swatch color={current} />
        </span>
      }
    >
      <DropdownLabel>Text colour</DropdownLabel>
      {TEXT_COLORS.map(({ label, value }) => (
        <DropdownItem
          key={label}
          active={current === value}
          onClick={() =>
            value
              ? editor.chain().focus().setColor(value).run()
              : editor.chain().focus().unsetColor().run()
          }
        >
          <Swatch color={value} />
          {label}
        </DropdownItem>
      ))}
    </Dropdown>
  );
}

function HighlightSelect({
  editor,
  current,
  active,
}: {
  editor: Editor;
  current: string | null;
  active: boolean;
}) {
  return (
    <Dropdown
      label="Highlight"
      width="12rem"
      trigger={
        <span className="inline-flex items-center gap-1">
          <Highlighter className={cn("size-4", active && "text-fg")} aria-hidden />
          <Swatch color={current} />
        </span>
      }
    >
      <DropdownLabel>Highlight</DropdownLabel>
      <DropdownItem
        active={!active}
        onClick={() => editor.chain().focus().unsetHighlight().run()}
      >
        <Swatch color={null} />
        None
      </DropdownItem>
      {HIGHLIGHT_COLORS.map(({ label, value }) => (
        <DropdownItem
          key={label}
          active={current === value}
          onClick={() => editor.chain().focus().setHighlight({ color: value }).run()}
        >
          <Swatch color={value} />
          {label}
        </DropdownItem>
      ))}
    </Dropdown>
  );
}

/* ---------------------------------------------------------------- toolbar -- */

export function EditorToolbar({
  editor,
  state,
  library,
  onManageFonts,
  onInsertLink,
  onInsertImage,
}: {
  editor: Editor;
  state: ToolbarSnapshot;
  library: SiteFont[];
  onManageFonts: () => void;
  onInsertLink: () => void;
  onInsertImage: () => void;
}) {
  /** Indent/outdent has to try both list flavours; only one will apply. */
  const nudge = (direction: "in" | "out") => {
    const command = direction === "in" ? "sinkListItem" : "liftListItem";
    for (const type of ["listItem", "taskItem"]) {
      if (editor.chain().focus()[command](type).run()) return;
    }
  };

  return (
    <div
      // `sticky` inside the form's scroll container keeps the controls reachable
      // in a long article without taking the page out of normal flow.
      className="glass sticky top-2 z-20 flex flex-wrap items-center gap-x-1 gap-y-1.5 rounded-2xl px-2 py-1.5 shadow-lg"
    >
      <ToolbarGroup label="History">
        <ToolbarButton
          label="Undo"
          shortcut="Ctrl+Z"
          disabled={!state.canUndo}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="size-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Redo"
          shortcut="Ctrl+Shift+Z"
          disabled={!state.canRedo}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="size-4" aria-hidden />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarDivider />

      <BlockSelect editor={editor} current={state.block} />

      <ToolbarDivider />

      <FontFamilySelect
        editor={editor}
        library={library}
        value={state.fontFamily}
        onManage={onManageFonts}
      />
      <FontSizeSelect editor={editor} value={state.fontSize} />

      <ToolbarDivider />

      <ToolbarGroup label="Text formatting">
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
          shortcut="Ctrl+Shift+S"
          active={state.strike}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="size-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Inline code"
          shortcut="Ctrl+E"
          active={state.code}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code className="size-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Superscript"
          active={state.superscript}
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
        >
          <Superscript className="size-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Subscript"
          active={state.subscript}
          onClick={() => editor.chain().focus().toggleSubscript().run()}
        >
          <Subscript className="size-4" aria-hidden />
        </ToolbarButton>
      </ToolbarGroup>

      <ColorSelect editor={editor} current={state.color} />
      <HighlightSelect
        editor={editor}
        current={state.highlight_color}
        active={state.highlight}
      />

      <ToolbarDivider />

      <ToolbarGroup label="Alignment">
        {(
          [
            ["left", "Align left", AlignLeft],
            ["center", "Align centre", AlignCenter],
            ["right", "Align right", AlignRight],
            ["justify", "Justify", AlignJustify],
          ] as const
        ).map(([value, label, Icon]) => (
          <ToolbarButton
            key={value}
            label={label}
            active={state.align === value}
            onClick={() =>
              value === "left"
                ? editor.chain().focus().unsetTextAlign().run()
                : editor.chain().focus().setTextAlign(value).run()
            }
          >
            <Icon className="size-4" aria-hidden />
          </ToolbarButton>
        ))}
      </ToolbarGroup>

      <ToolbarDivider />

      <LineHeightSelect editor={editor} value={state.lineHeight} />
      <LetterSpacingSelect editor={editor} value={state.letterSpacing} />
      <ParagraphSpacingSelect editor={editor} value={state.marginBottom} />

      <ToolbarDivider />

      <ToolbarGroup label="Lists">
        <ToolbarButton
          label="Bullet list"
          active={state.bulletList}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={state.orderedList}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Task list"
          active={state.taskList}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        >
          <ListTodo className="size-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Outdent"
          shortcut="Shift+Tab"
          disabled={!state.canOutdent}
          onClick={() => nudge("out")}
        >
          <IndentDecrease className="size-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Indent"
          shortcut="Tab"
          disabled={!state.canIndent}
          onClick={() => nudge("in")}
        >
          <IndentIncrease className="size-4" aria-hidden />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarDivider />

      <ToolbarGroup label="Insert">
        <ToolbarButton
          label={state.link ? "Edit link" : "Add link"}
          shortcut="Ctrl+K"
          active={state.link}
          onClick={onInsertLink}
        >
          <Link2 className="size-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton label="Insert image" onClick={onInsertImage}>
          <ImagePlus className="size-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Divider"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="size-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Clear formatting"
          onClick={() =>
            editor.chain().focus().unsetAllMarks().unsetTextAlign().unsetBlockStyle().run()
          }
        >
          <RemoveFormatting className="size-4" aria-hidden />
        </ToolbarButton>
      </ToolbarGroup>



    </div>
  );
}





