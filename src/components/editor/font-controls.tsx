"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/core";
import { Settings2, Type } from "lucide-react";
import {
  Dropdown,
  DropdownItem,
  DropdownLabel,
  useDropdown,
} from "@/components/editor/primitives";
import { DEFAULT_FONT_SIZE, FONT_SIZES } from "@/lib/editor/constants";
import { fontStack } from "@/lib/fonts/css";
import { loadFont } from "@/lib/fonts/use-font-loader";
import { SYSTEM_FONTS, type SiteFont } from "@/lib/fonts/types";
import { cn } from "@/lib/utils";

/** Font family and font size pickers for the toolbar. */

/** The stack written into the document — quoted family plus its fallbacks. */
function stackFor(font: SiteFont): string {
  return fontStack(font);
}

/** Match a stored `font-family` value back to a library entry. */
function matchFamily(value: string | null, all: SiteFont[]): SiteFont | null {
  if (!value) return null;
  const head = value.split(",")[0].trim().replace(/^["']|["']$/g, "").toLowerCase();
  return all.find((f) => f.family.toLowerCase() === head) ?? null;
}

export function FontFamilySelect({
  editor,
  library,
  value,
  onManage,
}: {
  editor: Editor;
  library: SiteFont[];
  value: string | null;
  onManage: () => void;
}) {
  const all = [...SYSTEM_FONTS, ...library];
  const current = matchFamily(value, all);

  return (
    <Dropdown
      label="Font family"
      width="17rem"
      trigger={
        <span
          className="max-w-28 truncate sm:max-w-36"
          style={current ? { fontFamily: stackFor(current) } : undefined}
        >
          {current?.family ?? "Default"}
        </span>
      }
    >
      <DropdownItem
        active={!current}
        onClick={() => editor.chain().focus().unsetFontFamily().run()}
      >
        Default
        <span className="ml-auto text-xs text-muted">Geist</span>
      </DropdownItem>

      <DropdownLabel>System · no download</DropdownLabel>
      {SYSTEM_FONTS.map((font) => (
        <DropdownItem
          key={font.id}
          active={current?.family === font.family}
          style={{ fontFamily: stackFor(font) }}
          onClick={() => editor.chain().focus().setFontFamily(stackFor(font)).run()}
        >
          {font.family}
        </DropdownItem>
      ))}

      {library.length > 0 && <DropdownLabel>Your library</DropdownLabel>}
      {library.map((font) => (
        <DropdownItem
          key={font.id}
          active={current?.family === font.family}
          style={{ fontFamily: stackFor(font) }}
          onClick={() => {
            loadFont(font);
            editor.chain().focus().setFontFamily(stackFor(font)).run();
          }}
        >
          <span className="truncate">{font.family}</span>
          <span className="ml-auto shrink-0 font-mono text-[10px] text-muted">
            {font.source === "google" ? "Google" : "Custom"}
          </span>
        </DropdownItem>
      ))}

      <div className="mt-1 border-t border-line pt-1">
        <ManageFontsItem onManage={onManage} />
      </div>
    </Dropdown>
  );
}

/** Split out so it can close the dropdown before opening the modal. */
function ManageFontsItem({ onManage }: { onManage: () => void }) {
  const { close } = useDropdown();
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        close();
        onManage();
      }}
      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-cyan transition-colors hover:bg-white/10"
    >
      <Settings2 className="size-4" aria-hidden />
      Manage fonts…
    </button>
  );
}

/** Read `16px` back to `16`; anything unparseable falls back to the default. */
function sizeNumber(value: string | null): number {
  const parsed = Number.parseFloat((value ?? "").replace("px", ""));
  return Number.isFinite(parsed) ? Math.round(parsed) : DEFAULT_FONT_SIZE;
}

export function FontSizeSelect({
  editor,
  value,
}: {
  editor: Editor;
  value: string | null;
}) {
  const current = value ? sizeNumber(value) : null;

  return (
    <Dropdown
      label="Font size"
      width="11rem"
      trigger={
        <span className="inline-flex items-center gap-1 font-mono text-xs">
          <Type className="size-3.5" aria-hidden />
          {current ?? DEFAULT_FONT_SIZE}
        </span>
      }
    >
      <DropdownItem
        active={current === null}
        onClick={() => editor.chain().focus().unsetFontSize().run()}
      >
        Default
      </DropdownItem>
      {FONT_SIZES.map((size) => (
        <DropdownItem
          key={size}
          active={current === size}
          onClick={() => editor.chain().focus().setFontSize(`${size}px`).run()}
        >
          <span className="font-mono text-xs">{size}px</span>
          <span
            className="ml-auto truncate text-fg"
            style={{ fontSize: `${Math.min(size, 22)}px`, lineHeight: 1 }}
            aria-hidden
          >
            Aa
          </span>
        </DropdownItem>
      ))}
      <div className="mt-1 border-t border-line p-1.5 pt-2">
        <CustomSizeInput editor={editor} initial={current ?? DEFAULT_FONT_SIZE} />
      </div>
    </Dropdown>
  );
}

function CustomSizeInput({ editor, initial }: { editor: Editor; initial: number }) {
  const [draft, setDraft] = useState(String(initial));
  const { close } = useDropdown();

  const commit = () => {
    const size = Number.parseFloat(draft);
    // 8–200px keeps the value inside what the CSS allow-list accepts.
    if (Number.isFinite(size) && size >= 8 && size <= 200) {
      editor.chain().focus().setFontSize(`${Math.round(size)}px`).run();
      close();
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min={8}
        max={200}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        aria-label="Custom font size in pixels"
        className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 py-1 font-mono text-xs text-fg focus:border-violet/60 focus:outline-none"
      />
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={commit}
        className={cn(
          "shrink-0 rounded-lg bg-white/10 px-2 py-1 text-xs text-fg transition-colors hover:bg-white/20",
        )}
      >
        Set
      </button>
    </div>
  );
}
