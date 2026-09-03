"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  NodeViewContent,
  NodeViewWrapper,
  type ReactNodeViewProps,
} from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Check,
  Link2,
  Text,
  Trash2,
} from "lucide-react";
import { isSafeUrl } from "@/lib/content/schema";
import { cn } from "@/lib/utils";

/**
 * Node view for the figure node: drag-to-resize, alignment, alt text and an
 * editable caption.
 *
 * Resizing is width-in-percent so the image stays fluid — a fixed pixel width
 * would overflow on mobile. The drag updates local state only, committing one
 * transaction on pointer-up, so the undo stack gets a single step instead of
 * one per mouse move.
 */

type Align = "left" | "center" | "right";

const WIDTH_PRESETS = [25, 50, 75, 100] as const;
const MIN_PERCENT = 10;

const chip =
  "inline-flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-white/10 hover:text-fg";
const chipActive = "bg-white/15 text-fg";

function percentOf(width: unknown): number | null {
  if (typeof width !== "string") return null;
  const match = width.trim().match(/^(\d{1,3}(?:\.\d{1,2})?)%$/);
  return match ? Number(match[1]) : null;
}

export function FigureView({
  node,
  updateAttributes,
  deleteNode,
  editor,
  selected,
}: ReactNodeViewProps) {
  const align = (node.attrs.align as Align) ?? "center";
  const src = typeof node.attrs.src === "string" ? node.attrs.src : "";
  const alt = typeof node.attrs.alt === "string" ? node.attrs.alt : "";
  const href = typeof node.attrs.href === "string" ? node.attrs.href : "";

  const holderRef = useRef<HTMLSpanElement>(null);
  const [dragPercent, setDragPercent] = useState<number | null>(null);
  const [panel, setPanel] = useState<"alt" | "link" | null>(null);
  const [altDraft, setAltDraft] = useState(alt);
  const [linkDraft, setLinkDraft] = useState(href);

  const editable = editor.isEditable;
  const storedPercent = percentOf(node.attrs.width);
  const shownPercent = dragPercent ?? storedPercent;

  // Reopening the panel should always show what is currently stored.
  useEffect(() => {
    if (panel === "alt") setAltDraft(alt);
    if (panel === "link") setLinkDraft(href);
  }, [panel, alt, href]);

  useEffect(() => {
    if (!selected) setPanel(null);
  }, [selected]);

  const startResize = useCallback(
    (event: React.PointerEvent<HTMLSpanElement>) => {
      if (!editable) return;
      event.preventDefault();
      event.stopPropagation();

      const holder = holderRef.current;
      const figure = holder?.parentElement;
      if (!holder || !figure) return;

      const available = figure.clientWidth;
      if (available <= 0) return;

      const startX = event.clientX;
      const startWidth = holder.getBoundingClientRect().width;
      // Right-aligned images grow leftwards, so the delta has to invert.
      const direction = align === "right" ? -1 : 1;

      const onMove = (move: PointerEvent) => {
        const delta = (move.clientX - startX) * direction;
        const next = ((startWidth + delta) / available) * 100;
        setDragPercent(Math.min(100, Math.max(MIN_PERCENT, Math.round(next))));
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        setDragPercent((current) => {
          if (current !== null) updateAttributes({ width: `${current}%` });
          return null;
        });
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [align, editable, updateAttributes],
  );

  const commitLink = () => {
    const value = linkDraft.trim();
    if (!value) {
      updateAttributes({ href: null, target: null, rel: null });
    } else if (isSafeUrl(value)) {
      updateAttributes({ href: value });
    }
    setPanel(null);
  };

  return (
    <NodeViewWrapper
      as="figure"
      data-type="figure"
      style={{ textAlign: align }}
      className="relative my-6"
    >
      <span ref={holderRef} className="relative inline-block max-w-full align-top">
        {src ? (
          // Author-supplied remote URLs cannot be pre-registered with next/image's loader.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            style={shownPercent !== null ? { width: `${shownPercent}%` } : undefined}
            className={cn(
              "h-auto max-w-full rounded-xl",
              selected && "ring-2 ring-cyan ring-offset-2 ring-offset-ink",
            )}
            draggable={false}
          />
        ) : (
          <span className="flex h-32 w-64 items-center justify-center rounded-xl border border-dashed border-line text-xs text-muted">
            No image source
          </span>
        )}

        {editable && (
          <span
            role="presentation"
            onPointerDown={startResize}
            title="Drag to resize"
            className={cn(
              "absolute -bottom-1 -right-1 size-4 cursor-nwse-resize rounded-full border-2 border-ink bg-cyan transition-opacity",
              selected ? "opacity-100" : "opacity-0",
            )}
          />
        )}

        {dragPercent !== null && (
          <span className="absolute bottom-2 right-2 rounded-md bg-ink/80 px-2 py-0.5 font-mono text-xs text-fg">
            {dragPercent}%
          </span>
        )}
      </span>

      {editable && selected && (
        <span
          contentEditable={false}
          className="glass absolute -top-11 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 whitespace-nowrap px-1.5 py-1"
        >
          {(["left", "center", "right"] as const).map((value) => {
            const Icon =
              value === "left" ? AlignLeft : value === "center" ? AlignCenter : AlignRight;
            return (
              <button
                key={value}
                type="button"
                aria-label={`Align ${value}`}
                aria-pressed={align === value}
                onClick={() => updateAttributes({ align: value })}
                className={cn(chip, align === value && chipActive)}
              >
                <Icon className="size-4" />
              </button>
            );
          })}

          <span className="mx-1 h-5 w-px bg-line" />

          {WIDTH_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => updateAttributes({ width: `${preset}%` })}
              className={cn(
                "rounded-md px-1.5 py-1 font-mono text-[11px] text-muted transition-colors hover:bg-white/10 hover:text-fg",
                storedPercent === preset && chipActive,
              )}
            >
              {preset}%
            </button>
          ))}

          <span className="mx-1 h-5 w-px bg-line" />

          <button
            type="button"
            aria-label="Edit alt text"
            aria-pressed={panel === "alt"}
            title={alt ? `Alt: ${alt}` : "Add alt text (needed for accessibility)"}
            onClick={() => setPanel(panel === "alt" ? null : "alt")}
            className={cn(chip, panel === "alt" && chipActive, !alt && "text-amber-400")}
          >
            <Text className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Link this image"
            aria-pressed={panel === "link"}
            onClick={() => setPanel(panel === "link" ? null : "link")}
            className={cn(chip, (panel === "link" || href) && chipActive)}
          >
            <Link2 className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Remove image"
            onClick={() => deleteNode()}
            className={cn(chip, "hover:bg-red-500/20 hover:text-red-300")}
          >
            <Trash2 className="size-4" />
          </button>
        </span>
      )}

      {editable && selected && panel && (
        <span
          contentEditable={false}
          className="glass absolute left-1/2 top-0 z-10 flex w-[min(24rem,90%)] -translate-x-1/2 items-center gap-2 p-2"
        >
          <input
            autoFocus
            value={panel === "alt" ? altDraft : linkDraft}
            onChange={(e) =>
              panel === "alt" ? setAltDraft(e.target.value) : setLinkDraft(e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (panel === "alt") {
                  updateAttributes({ alt: altDraft.trim() });
                  setPanel(null);
                } else {
                  commitLink();
                }
              }
              if (e.key === "Escape") setPanel(null);
            }}
            placeholder={
              panel === "alt"
                ? "Describe the image for screen readers"
                : "https://example.com"
            }
            aria-label={panel === "alt" ? "Alt text" : "Image link URL"}
            className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-fg placeholder:text-muted/60 focus:border-violet/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              if (panel === "alt") {
                updateAttributes({ alt: altDraft.trim() });
                setPanel(null);
              } else {
                commitLink();
              }
            }}
            className={chip}
            aria-label="Apply"
          >
            <Check className="size-4" />
          </button>
        </span>
      )}

      {/* The type argument is explicit because `as` is wrapped in NoInfer. */}
      <NodeViewContent<"figcaption">
        as="figcaption"
        className="mt-2 text-sm text-muted empty:before:text-muted/50 empty:before:content-['Add_a_caption…']"
      />
    </NodeViewWrapper>
  );
}
