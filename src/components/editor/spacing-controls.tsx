"use client";

import type { Editor } from "@tiptap/core";
import { ArrowLeftRight, MoveVertical, Rows3 } from "lucide-react";
import {
  Dropdown,
  DropdownItem,
  DropdownLabel,
} from "@/components/editor/primitives";
import {
  LETTER_SPACINGS,
  LINE_HEIGHTS,
  PARAGRAPH_SPACINGS,
} from "@/lib/editor/constants";

/**
 * Line height, letter spacing and paragraph spacing.
 *
 * All three write block attributes through `setBlockStyle`, so they land on the
 * `<p>`/`<h*>`/`<blockquote>` itself rather than on an inline span — see
 * `lib/editor/extensions/block-style.ts` for why that distinction matters.
 *
 * The current value is passed in rather than read here: the toolbar takes one
 * `useEditorState` snapshot per transaction and hands slices of it down, which
 * keeps a dozen controls from each subscribing to the editor separately.
 */

export type SpacingSnapshot = {
  lineHeight: string | null;
  letterSpacing: string | null;
  marginBottom: string | null;
};

/** One dropdown for one block attribute. */
function SpacingMenu({
  editor,
  label,
  icon,
  hint,
  current,
  options,
  attribute,
  /** Rendered to the right of each row as a live sample. */
  sample,
}: {
  editor: Editor;
  label: string;
  icon: React.ReactNode;
  hint: string;
  current: string | null;
  options: readonly { label: string; value: string }[];
  attribute: keyof SpacingSnapshot;
  sample?: (value: string) => React.CSSProperties;
}) {
  const match = options.find((option) => option.value === current);

  return (
    <Dropdown
      label={label}
      width="14rem"
      trigger={
        <span className="inline-flex items-center gap-1.5">
          {icon}
          <span className="hidden text-xs lg:inline">{match?.label ?? "Auto"}</span>
        </span>
      }
    >
      <DropdownLabel>{hint}</DropdownLabel>
      <DropdownItem
        active={!current}
        onClick={() => editor.chain().focus().setBlockStyle({ [attribute]: null }).run()}
      >
        Auto
        <span className="ml-auto text-xs text-muted">theme default</span>
      </DropdownItem>
      {options.map((option) => (
        <DropdownItem
          key={option.value}
          active={current === option.value}
          onClick={() =>
            editor
              .chain()
              .focus()
              .setBlockStyle({ [attribute]: option.value })
              .run()
          }
        >
          {option.label}
          {sample ? (
            <span
              aria-hidden
              className="ml-auto max-w-24 overflow-hidden whitespace-nowrap text-[11px] text-fg"
              style={sample(option.value)}
            >
              Aa Bb
            </span>
          ) : (
            <span className="ml-auto font-mono text-[11px] text-muted">
              {option.value}
            </span>
          )}
        </DropdownItem>
      ))}
    </Dropdown>
  );
}

export function LineHeightSelect({
  editor,
  value,
}: {
  editor: Editor;
  value: string | null;
}) {
  return (
    <SpacingMenu
      editor={editor}
      label="Line height"
      hint="Leading"
      icon={<MoveVertical className="size-3.5" aria-hidden />}
      current={value}
      options={LINE_HEIGHTS}
      attribute="lineHeight"
    />
  );
}

export function LetterSpacingSelect({
  editor,
  value,
}: {
  editor: Editor;
  value: string | null;
}) {
  return (
    <SpacingMenu
      editor={editor}
      label="Letter spacing"
      hint="Tracking"
      icon={<ArrowLeftRight className="size-3.5" aria-hidden />}
      current={value}
      options={LETTER_SPACINGS}
      attribute="letterSpacing"
      sample={(value) => ({ letterSpacing: value })}
    />
  );
}

export function ParagraphSpacingSelect({
  editor,
  value,
}: {
  editor: Editor;
  value: string | null;
}) {
  return (
    <SpacingMenu
      editor={editor}
      label="Paragraph spacing"
      hint="Space after block"
      icon={<Rows3 className="size-3.5" aria-hidden />}
      current={value}
      options={PARAGRAPH_SPACINGS}
      attribute="marginBottom"
    />
  );
}
