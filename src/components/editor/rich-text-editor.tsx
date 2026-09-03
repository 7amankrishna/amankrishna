"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Editor, JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { AlertCircle, Eye, Loader2, Pencil } from "lucide-react";
import { buildExtensions } from "@/lib/editor/extensions";
import { isUploadableImage, uploadArticleImage } from "@/lib/editor/upload";
import { extractFontFamilies } from "@/lib/fonts/extract";
import type { SiteFont } from "@/lib/fonts/types";
import { useFontLoader } from "@/lib/fonts/use-font-loader";
import { EditorBubbleMenu } from "@/components/editor/bubble-menu";
import { EditorStats } from "@/components/editor/editor-stats";
import { EditorToolbar, useToolbarSnapshot } from "@/components/editor/editor-toolbar";
import { FontManager } from "@/components/editor/font-manager";
import { ImageDialog } from "@/components/editor/image-dialog";
import { LinkDialog } from "@/components/editor/link-dialog";
import {
  ArticlePreview,
  PreviewWidthToggle,
  type PreviewWidth,
} from "@/components/editor/article-preview";
import { cn } from "@/lib/utils";

/**
 * The editor, assembled.
 *
 * Everything here is wiring; the parts that do the work live in their own files
 * (toolbar, bubble menu, dialogs, stats, preview, font loading, uploads). This
 * component owns exactly three things: the ProseMirror instance, which dialog is
 * open, and getting the document into the surrounding `<form>`.
 *
 * ## How the content reaches the server
 *
 * Two paths, on purpose:
 *
 *   1. Hidden inputs, refreshed on a debounce. They are the declarative
 *      baseline — present in the DOM from first paint, seeded with whatever was
 *      loaded, so a submit that happens before the editor finishes mounting
 *      round-trips the existing article instead of blanking it.
 *   2. A `formdata` listener on the enclosing form, which overwrites those three
 *      fields with a fresh serialisation at the instant the FormData is built.
 *      This is what removes the debounce from the correctness argument: no
 *      matter how fast the author types and hits save, what gets posted is the
 *      document as it stands, not as it stood 300ms ago.
 *
 * `content_json` is the lossless record and `content_html` is what gets
 * sanitised and rendered; both are stored because re-parsing HTML back into a
 * ProseMirror document is lossy at the edges (empty nodes, attribute defaults).
 */

/** Only a JSON document with a node type is worth handing to TipTap. */
function asDocument(value: unknown): JSONContent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return "type" in value ? (value as JSONContent) : null;
}

type Dialog = "link" | "image" | "fonts" | null;

export type EditorSnapshot = {
  html: string;
  json: string;
  fonts: string[];
};

export function RichTextEditor({
  initialHtml,
  initialJson,
  library: initialLibrary,
  title,
  placeholder,
  onChange,
}: {
  /** Body HTML to open with — already resolved from legacy blocks if needed. */
  initialHtml: string;
  /** TipTap JSON, when the article has been saved by this editor before. */
  initialJson: unknown;
  library: SiteFont[];
  /** Article title, shown in the preview's header. */
  title: string;
  placeholder?: string;
  /** Fires on the debounce, for the SEO checklist and autosave. */
  onChange?: (snapshot: EditorSnapshot) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [library, setLibrary] = useState(initialLibrary);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [previewWidth, setPreviewWidth] = useState<PreviewWidth>("desktop");
  const [uploading, setUploading] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  const [doc, setDoc] = useState(() => ({
    html: initialHtml,
    json: asDocument(initialJson) ? JSON.stringify(initialJson) : "",
  }));

  useFontLoader(library);

  /**
   * Upload dropped/pasted images and insert them where they landed.
   *
   * Sequential rather than parallel: three images dropped at once produce three
   * figures in the order they were dropped, and a failure part-way through still
   * leaves the successful ones in place with an error naming what went wrong.
   */
  const insertFiles = useCallback(async (files: File[], at?: number) => {
    const editor = editorRef.current;
    if (!editor) return;
    setNotice(null);

    for (const [index, file] of files.entries()) {
      setUploading((n) => n + 1);
      const result = await uploadArticleImage(file);
      setUploading((n) => n - 1);

      if (!result.ok) {
        setNotice(result.error);
        continue;
      }

      const chain = editor.chain().focus();
      // Only the first insert honours the drop position; after that the
      // selection has moved on and is already where the next figure belongs.
      if (index === 0 && typeof at === "number") chain.setTextSelection(at);
      chain.setFigure({ src: result.url, alt: "", align: "center" }).run();
    }
  }, []);

  const editor = useEditor({
    // `false` because this renders inside a server-rendered page: rendering the
    // document during SSR and again on hydration is what produces TipTap's
    // hydration-mismatch warning.
    immediatelyRender: false,
    extensions: buildExtensions({ placeholder }),
    content: asDocument(initialJson) ?? initialHtml,
    onCreate: ({ editor }) => {
      editorRef.current = editor;
    },
    onUpdate: ({ editor }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setDoc({ html: editor.getHTML(), json: JSON.stringify(editor.getJSON()) });
      }, 300);
    },
    editorProps: {
      attributes: {
        // `.prose-article` is the shared stylesheet; `.tiptap` is added by
        // ProseMirror and gates the editor-only rules in globals.css.
        class: "prose-article focus:outline-none",
        spellcheck: "true",
        "aria-label": "Article body",
      },

      handleKeyDown: (_view, event) => {
        // The toolbar advertises Ctrl+K, so it has to actually work.
        if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "k") {
          event.preventDefault();
          setDialog("link");
          return true;
        }
        return false;
      },

      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter(isUploadableImage);
        if (!files.length) return false;
        event.preventDefault();
        void insertFiles(files);
        return true;
      },

      handleDrop: (view, event, _slice, moved) => {
        // `moved` means a node is being dragged within the document — that is
        // ProseMirror's job, not an upload.
        if (moved) return false;
        const files = Array.from(event.dataTransfer?.files ?? []).filter(isUploadableImage);
        if (!files.length) return false;
        event.preventDefault();
        const at = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        void insertFiles(files, at);
        return true;
      },
    },
  });

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const fonts = useMemo(() => extractFontFamilies(doc.html), [doc.html]);

  useEffect(() => {
    onChange?.({ html: doc.html, json: doc.json, fonts });
  }, [doc, fonts, onChange]);

  /**
   * Overwrite the hidden inputs at the moment the form is serialised.
   *
   * `new FormData(form)` fires `formdata` on the form, and React builds server
   * action payloads that way, so this runs for both a plain submit and an
   * action — and the values posted are never a debounce behind the document.
   */
  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) return;

    const handle = (event: FormDataEvent) => {
      const editor = editorRef.current;
      if (!editor) return;
      // `fonts` is deliberately not posted — the save action recomputes it from
      // the sanitised HTML, so sending a list the server would ignore only
      // invites the belief that the client decides which fonts a page loads.
      event.formData.set("content_html", editor.getHTML());
      event.formData.set("content_json", JSON.stringify(editor.getJSON()));
    };

    form.addEventListener("formdata", handle);
    return () => form.removeEventListener("formdata", handle);
  }, []);

  /** Serialise now rather than on the debounce, so Preview is never behind. */
  const showPreview = () => {
    const current = editorRef.current;
    if (current) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setDoc({ html: current.getHTML(), json: JSON.stringify(current.getJSON()) });
    }
    setTab("preview");
  };

  return (
    <div ref={rootRef} className="space-y-3">
      {/* Seeded from the loaded article and refreshed on the debounce; the
          `formdata` listener above replaces them at submit time. */}
      <input type="hidden" name="content_html" value={doc.html} />
      <input type="hidden" name="content_json" value={doc.json} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="tablist"
          aria-label="Editor mode"
          className="inline-flex items-center gap-0.5 rounded-xl border border-line p-0.5"
        >
          {(
            [
              ["edit", "Edit", Pencil],
              ["preview", "Preview", Eye],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              role="tab"
              id={`editor-tab-${key}`}
              aria-selected={tab === key}
              aria-controls={`editor-panel-${key}`}
              onClick={() => (key === "preview" ? showPreview() : setTab("edit"))}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-[0.6rem] px-3 py-1.5 text-xs transition-colors",
                tab === key ? "bg-fg text-ink" : "text-muted hover:text-fg",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        {tab === "preview" && (
          <PreviewWidthToggle value={previewWidth} onChange={setPreviewWidth} />
        )}
      </div>

      <div
        role="tabpanel"
        id="editor-panel-edit"
        aria-labelledby="editor-tab-edit"
        hidden={tab !== "edit"}
      >
        {editor ? (
          <EditorSurface
            editor={editor}
            library={library}
            onLibraryChange={setLibrary}
            dialog={dialog}
            onDialog={setDialog}
            showBubbleMenu={tab === "edit"}
            uploading={uploading}
            notice={notice}
            onDismissNotice={() => setNotice(null)}
          />
        ) : (
          <div
            className="h-72 animate-pulse rounded-2xl border border-line bg-ink-2"
            aria-busy="true"
            aria-label="Loading the editor"
          />
        )}
      </div>

      <div
        role="tabpanel"
        id="editor-panel-preview"
        aria-labelledby="editor-tab-preview"
        hidden={tab !== "preview"}
      >
        <ArticlePreview html={doc.html} title={title} width={previewWidth} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- surface -- */

/**
 * Everything that needs a *non-null* editor.
 *
 * Splitting it out is not cosmetic: `useEditor({ immediatelyRender: false })`
 * returns `null` until the effect that creates the instance has run, and
 * `useToolbarSnapshot` is a hook, so it cannot be called conditionally. A child
 * that only mounts once the editor exists is the version of this that does not
 * need a nullable snapshot type threaded through thirty controls.
 */
function EditorSurface({
  editor,
  library,
  onLibraryChange,
  dialog,
  onDialog,
  showBubbleMenu,
  uploading,
  notice,
  onDismissNotice,
}: {
  editor: Editor;
  library: SiteFont[];
  onLibraryChange: (fonts: SiteFont[]) => void;
  dialog: Dialog;
  onDialog: (dialog: Dialog) => void;
  showBubbleMenu: boolean;
  uploading: number;
  notice: string | null;
  onDismissNotice: () => void;
}) {
  const state = useToolbarSnapshot(editor);
  const close = () => onDialog(null);

  return (
    <div className="space-y-3">
      <EditorToolbar
        editor={editor}
        state={state}
        library={library}
        onManageFonts={() => onDialog("fonts")}
        onInsertLink={() => onDialog("link")}
        onInsertImage={() => onDialog("image")}
      />

      {/* Rendered in a portal, so it has to be unmounted while the Preview tab
          is showing — a `hidden` ancestor would not hide it. */}
      {showBubbleMenu && (
        <EditorBubbleMenu
          editor={editor}
          state={state}
          onInsertLink={() => onDialog("link")}
        />
      )}

      <div
        className="cursor-text rounded-2xl border border-line bg-ink-2 px-4 py-5 sm:px-7 sm:py-8"
        // Clicking the padding around the canvas should put the caret in the
        // document, the way clicking the margin of a page in a word processor
        // does. Without this, the click lands on the wrapper and does nothing.
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            event.preventDefault();
            editor.chain().focus("end").run();
          }
        }}
      >
        <EditorContent editor={editor} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <EditorStats editor={editor} />
        {uploading > 0 && (
          <p role="status" className="inline-flex items-center gap-1.5 text-xs text-muted">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Uploading {uploading === 1 ? "image" : `${uploading} images`}…
          </p>
        )}
      </div>

      {notice && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-300"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span className="flex-1">{notice}</span>
          <button
            type="button"
            onClick={onDismissNotice}
            className="shrink-0 underline decoration-dotted"
          >
            Dismiss
          </button>
        </p>
      )}

      <LinkDialog open={dialog === "link"} onClose={close} editor={editor} />
      <ImageDialog open={dialog === "image"} onClose={close} editor={editor} />
      <FontManager
        open={dialog === "fonts"}
        onClose={close}
        library={library}
        onLibraryChange={onLibraryChange}
      />
    </div>
  );
}




