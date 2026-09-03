"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import {
  AlertCircle,
  AlignCenter,
  AlignLeft,
  AlignRight,
  ImagePlus,
  Loader2,
  Upload,
} from "lucide-react";
import { isSafeUrl } from "@/lib/content/schema";
import {
  ACCEPT_ATTRIBUTE,
  MAX_UPLOAD_BYTES,
  uploadArticleImage,
} from "@/lib/editor/upload";
import { Field, fieldClass, Modal } from "@/components/editor/primitives";
import { cn } from "@/lib/utils";

/**
 * Insert an image: upload a file or paste a URL, then set the metadata that
 * makes it publishable — alt text, an optional caption, alignment and width.
 *
 * Alt text is nudged rather than enforced: a decorative image legitimately has
 * an empty alt, and blocking the insert would just teach the author to type "."
 */

type Align = "left" | "center" | "right";
const ALIGNMENTS: { value: Align; label: string; Icon: typeof AlignLeft }[] = [
  { value: "left", label: "Left", Icon: AlignLeft },
  { value: "center", label: "Center", Icon: AlignCenter },
  { value: "right", label: "Right", Icon: AlignRight },
];

const WIDTHS = [25, 50, 75, 100] as const;

export function ImageDialog({
  open,
  onClose,
  editor,
}: {
  open: boolean;
  onClose: () => void;
  editor: Editor;
}) {
  const [src, setSrc] = useState("");
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [align, setAlign] = useState<Align>("center");
  const [width, setWidth] = useState<number>(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setSrc("");
    setAlt("");
    setCaption("");
    setAlign("center");
    setWidth(100);
    setError(null);
    setDragging(false);
  }, [open]);

  const handleFile = async (file: File) => {
    setBusy(true);
    setError(null);
    const result = await uploadArticleImage(file);
    setBusy(false);
    if (result.ok) {
      setSrc(result.url);
      // A filename is a poor alt text, but it is a better starting point than
      // an empty field, and the author is looking right at it.
      if (!alt) setAlt(file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));
    } else {
      setError(result.error);
    }
  };

  const valid = !!src.trim() && isSafeUrl(src.trim());

  const insert = () => {
    if (!valid) {
      setError("Enter an image URL or upload a file first.");
      return;
    }
    editor
      .chain()
      .focus()
      .setFigure({
        src: src.trim(),
        alt: alt.trim(),
        caption,
        align,
        width: `${width}%`,
      })
      .run();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Insert image">
      <div className="space-y-4">
        {/* Upload / drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void handleFile(file);
          }}
          className={cn(
            "rounded-xl border border-dashed p-6 text-center transition-colors",
            dragging ? "border-cyan bg-cyan/5" : "border-line",
          )}
        >
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm text-fg transition-colors hover:bg-white/10 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Upload className="size-4" aria-hidden />
            )}
            {busy ? "Uploading…" : "Choose a file"}
          </button>
          <p className="mt-2 text-xs text-muted">
            …or drag one here. PNG, JPEG, WebP, AVIF, GIF up to{" "}
            {MAX_UPLOAD_BYTES / (1024 * 1024)} MB.
          </p>
        </div>

        <Field
          label="Image URL"
          hint={<span className="text-xs">Filled in automatically after an upload</span>}
        >
          <input
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            placeholder="https://…"
            className={fieldClass}
          />
        </Field>

        {src && valid && (
          // Arbitrary remote hosts cannot be registered with next/image's loader.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            className="max-h-40 w-auto rounded-xl border border-line object-contain"
          />
        )}

        <Field
          label="Alt text"
          hint={
            <span className={cn("text-xs", !alt.trim() && "text-amber-400")}>
              {alt.trim() ? `${alt.trim().length} chars` : "Recommended"}
            </span>
          }
        >
          <input
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="What the image shows, for screen readers and search"
            className={fieldClass}
          />
        </Field>

        <Field label="Caption" hint={<span className="text-xs">Optional</span>}>
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Shown under the image"
            className={fieldClass}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="mb-1.5 block text-sm text-muted">Alignment</span>
            <div className="flex gap-1 rounded-xl border border-line p-1">
              {ALIGNMENTS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`Align ${label}`}
                  aria-pressed={align === value}
                  onClick={() => setAlign(value)}
                  className={cn(
                    "flex flex-1 items-center justify-center rounded-lg py-1.5 transition-colors",
                    align === value ? "bg-white/10 text-fg" : "text-muted hover:text-fg",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-sm text-muted">Width</span>
            <div className="flex gap-1 rounded-xl border border-line p-1">
              {WIDTHS.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={width === value}
                  onClick={() => setWidth(value)}
                  className={cn(
                    "flex-1 rounded-lg py-1.5 font-mono text-xs transition-colors",
                    width === value ? "bg-white/10 text-fg" : "text-muted hover:text-fg",
                  )}
                >
                  {value}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <p role="alert" className="flex items-center gap-1.5 text-xs text-red-400">
            <AlertCircle className="size-3.5" aria-hidden />
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={!valid || busy}
          onClick={insert}
          className="inline-flex items-center gap-2 rounded-xl bg-fg px-4 py-2 text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <ImagePlus className="size-4" aria-hidden />
          Insert image
        </button>
      </div>
    </Modal>
  );
}
