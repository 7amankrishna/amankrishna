"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/core";
import { AlertCircle, Link2, Unlink } from "lucide-react";
import { isSafeUrl } from "@/lib/content/schema";
import { Field, fieldClass, Modal } from "@/components/editor/primitives";
import { cn } from "@/lib/utils";

/**
 * Link dialog: URL, optional text, and the rel/target attributes an author
 * actually needs (`nofollow` for untrusted destinations, `sponsored` for paid
 * ones, new-tab for outbound reading).
 *
 * `noopener noreferrer` is added automatically whenever new-tab is on — a
 * `target="_blank"` link without it hands the opened page a handle on this one.
 */

type LinkState = {
  href: string;
  text: string;
  newTab: boolean;
  nofollow: boolean;
  sponsored: boolean;
};

const EMPTY: LinkState = {
  href: "",
  text: "",
  newTab: false,
  nofollow: false,
  sponsored: false,
};

function relFrom(state: LinkState): string | null {
  const tokens: string[] = [];
  if (state.nofollow) tokens.push("nofollow");
  if (state.sponsored) tokens.push("sponsored");
  if (state.newTab) tokens.push("noopener", "noreferrer");
  return tokens.length ? [...new Set(tokens)].join(" ") : null;
}

export function LinkDialog({
  open,
  onClose,
  editor,
}: {
  open: boolean;
  onClose: () => void;
  editor: Editor;
}) {
  const [state, setState] = useState<LinkState>(EMPTY);
  const [touched, setTouched] = useState(false);

  const active = editor.isActive("link");
  const { from, to } = editor.state.selection;
  const hasSelection = from !== to;

  // Prefill from the link under the cursor each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    const attrs = editor.getAttributes("link");
    const rel = typeof attrs.rel === "string" ? attrs.rel : "";
    setState({
      href: typeof attrs.href === "string" ? attrs.href : "",
      text: editor.state.doc.textBetween(from, to, " "),
      newTab: attrs.target === "_blank",
      nofollow: rel.includes("nofollow"),
      sponsored: rel.includes("sponsored"),
    });
    setTouched(false);
  }, [open, editor, from, to]);

  const href = state.href.trim();
  const valid = !!href && isSafeUrl(href);

  const apply = () => {
    setTouched(true);
    if (!valid) return;

    const attributes = {
      href,
      target: state.newTab ? "_blank" : null,
      rel: relFrom(state),
    };

    if (hasSelection || active) {
      editor.chain().focus().extendMarkRange("link").setLink(attributes).run();
    } else {
      // Nothing selected: insert the label, then link it.
      const label = state.text.trim() || href;
      editor
        .chain()
        .focus()
        .insertContent({
          type: "text",
          text: label,
          marks: [{ type: "link", attrs: attributes }],
        })
        .run();
    }
    onClose();
  };

  const remove = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={active ? "Edit link" : "Add link"}
    >
      <div className="space-y-4">
        <Field label="URL">
          <input
            autoFocus
            value={state.href}
            onChange={(e) => setState({ ...state, href: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                apply();
              }
            }}
            placeholder="https://example.com/page"
            aria-invalid={touched && !valid}
            className={cn(
              fieldClass,
              touched && !valid && "border-red-400/60 focus:border-red-400",
            )}
          />
        </Field>

        {touched && !valid && (
          <p className="flex items-center gap-1.5 text-xs text-red-400">
            <AlertCircle className="size-3.5" aria-hidden />
            Enter an http(s), mailto: or tel: URL, or a path starting with “/”.
          </p>
        )}

        {!hasSelection && !active && (
          <Field label="Link text" hint={<span className="text-xs">Optional</span>}>
            <input
              value={state.text}
              onChange={(e) => setState({ ...state, text: e.target.value })}
              placeholder="Defaults to the URL"
              className={fieldClass}
            />
          </Field>
        )}

        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm text-muted">Link attributes</legend>
          {(
            [
              ["newTab", "Open in a new tab", "Adds target=_blank plus noopener noreferrer"],
              ["nofollow", "Add rel=nofollow", "Tells search engines not to pass ranking credit"],
              ["sponsored", "Add rel=sponsored", "Required for paid or affiliate links"],
            ] as const
          ).map(([key, label, hint]) => (
            <label key={key} className="flex cursor-pointer items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={state[key]}
                onChange={(e) => setState({ ...state, [key]: e.target.checked })}
                className="mt-0.5 size-4 shrink-0 accent-[#7c5cff]"
              />
              <span>
                <span className="block text-fg">{label}</span>
                <span className="block text-xs text-muted">{hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={apply}
            className="inline-flex items-center gap-2 rounded-xl bg-fg px-4 py-2 text-sm font-medium text-ink transition-opacity hover:opacity-90"
          >
            <Link2 className="size-4" aria-hidden />
            {active ? "Update link" : "Add link"}
          </button>
          {active && (
            <button
              type="button"
              onClick={remove}
              className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm text-muted transition-colors hover:text-fg"
            >
              <Unlink className="size-4" aria-hidden />
              Remove link
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
