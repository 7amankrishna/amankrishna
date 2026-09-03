"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { AlertCircle, Check, Loader2, Plus, Search, Trash2 } from "lucide-react";
import {
  addCustomFont,
  addGoogleFont,
  removeFont,
  type FontActionResult,
} from "@/app/actions/fonts";
import { isSafeFontUrl } from "@/lib/content/schema";
import type { CatalogEntry } from "@/lib/fonts/catalog";
import { googleFontsCssUrl } from "@/lib/fonts/css";
import { WEIGHT_LABELS, type SiteFont } from "@/lib/fonts/types";
import { Field, fieldClass, Modal } from "@/components/editor/primitives";
import { cn } from "@/lib/utils";

/**
 * Add fonts without downloading font files.
 *
 * Two routes in: search Google Fonts (live catalogue when
 * `GOOGLE_FONTS_API_KEY` is set, the bundled offline list otherwise), or paste a
 * URL to a self-hosted `.woff2`/`.css`. Either way only *metadata* is stored —
 * the actual stylesheet is requested per article, for the families that article
 * uses, so a large library never slows a published page down.
 */

type Tab = "google" | "custom";

const WEIGHT_ORDER = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

/** Load 400-weight previews for the visible results in a single request. */
function useSearchPreviews(families: string[]) {
  const href = useMemo(() => {
    if (!families.length) return null;
    return googleFontsCssUrl(families.slice(0, 12).map((family) => ({ family, weights: [400] })));
  }, [families]);

  useEffect(() => {
    if (!href) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.fontPreview = "search";
    document.head.appendChild(link);
    return () => link.remove();
  }, [href]);
}

export function FontManager({
  open,
  onClose,
  library,
  onLibraryChange,
}: {
  open: boolean;
  onClose: () => void;
  library: SiteFont[];
  onLibraryChange: (fonts: SiteFont[]) => void;
}) {
  const [tab, setTab] = useState<Tab>("google");
  const [feedback, setFeedback] = useState<FontActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  // Google search
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogEntry[]>([]);
  const [source, setSource] = useState<"google" | "catalog" | null>(null);
  const [searching, setSearching] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [picked, setPicked] = useState<number[]>([400, 700]);

  // Custom font
  const [custom, setCustom] = useState({
    family: "",
    url: "",
    weight: 400,
    style: "normal" as "normal" | "italic",
    fallback: "sans-serif",
  });

  const installed = useMemo(
    () => new Set(library.map((f) => f.family.toLowerCase())),
    [library],
  );

  useSearchPreviews(results.map((r) => r.family));

  // Debounced search. Runs once on open so the list is never empty.
  useEffect(() => {
    if (!open || tab !== "google") return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/fonts/google?q=${encodeURIComponent(query)}&limit=30`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(`Search failed (${res.status})`);
        const body = (await res.json()) as {
          source: "google" | "catalog";
          fonts: CatalogEntry[];
        };
        setResults(body.fonts ?? []);
        setSource(body.source);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setResults([]);
          setFeedback({ ok: false, message: "Could not search fonts." });
        }
      } finally {
        setSearching(false);
      }
    }, query ? 250 : 0);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [open, tab, query]);

  const apply = useCallback(
    (run: () => Promise<FontActionResult>) => {
      startTransition(async () => {
        const result = await run();
        setFeedback(result);
        if (result.ok) {
          onLibraryChange(result.fonts);
          setExpanded(null);
        }
      });
    },
    [onLibraryChange],
  );

  const customUrlValid = !custom.url.trim() || isSafeFontUrl(custom.url.trim());

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Font library"
      description="Fonts you add here appear in the editor's font picker. Published pages only download the families an article actually uses."
    >
      <div className="mb-4 flex gap-1 rounded-xl border border-line p-1">
        {(
          [
            ["google", "Google Fonts"],
            ["custom", "Custom URL"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={tab === value}
            onClick={() => {
              setTab(value);
              setFeedback(null);
            }}
            className={cn(
              "flex-1 rounded-lg px-3 py-1.5 text-sm transition-colors",
              tab === value ? "bg-white/10 text-fg" : "text-muted hover:text-fg",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "google" ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2.5">
            <Search className="size-4 shrink-0 text-muted" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Google Fonts…"
              aria-label="Search Google Fonts"
              className="min-w-0 flex-1 bg-transparent text-sm text-fg placeholder:text-muted/60 focus:outline-none"
            />
            {searching && <Loader2 className="size-4 animate-spin text-muted" aria-hidden />}
          </div>

          {source === "catalog" && (
            <p className="text-xs text-muted">
              Searching the bundled catalogue. Set{" "}
              <code className="font-mono text-cyan">GOOGLE_FONTS_API_KEY</code> to search
              the full Google Fonts library.
            </p>
          )}

          <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
            {results.map((font) => {
              const already = installed.has(font.family.toLowerCase());
              const isOpen = expanded === font.family;
              const offered = WEIGHT_ORDER.filter((w) => font.weights.includes(w));

              return (
                <li key={font.family} className="rounded-xl border border-line">
                  <button
                    type="button"
                    disabled={already}
                    onClick={() => {
                      setExpanded(isOpen ? null : font.family);
                      setPicked(
                        offered.filter((w) => w === 400 || w === 700).length
                          ? offered.filter((w) => w === 400 || w === 700)
                          : offered.slice(0, 2),
                      );
                    }}
                    className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left disabled:opacity-50"
                  >
                    <span className="min-w-0">
                      <span
                        className="block truncate text-base text-fg"
                        style={{ fontFamily: `"${font.family}", sans-serif` }}
                      >
                        {font.family}
                      </span>
                      <span className="text-xs text-muted">
                        {font.category} · {font.weights.length} weight
                        {font.weights.length === 1 ? "" : "s"}
                        {font.italic && " · italic"}
                      </span>
                    </span>
                    {already ? (
                      <span className="flex shrink-0 items-center gap-1 text-xs text-cyan">
                        <Check className="size-3.5" aria-hidden /> In library
                      </span>
                    ) : (
                      <Plus className="size-4 shrink-0 text-muted" aria-hidden />
                    )}
                  </button>

                  {isOpen && !already && (
                    <div className="border-t border-line px-3.5 py-3">
                      <p className="mb-2 text-xs text-muted">
                        Pick the weights to load. Fewer weights means fewer bytes on every
                        article that uses this family.
                      </p>
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        {offered.map((weight) => {
                          const on = picked.includes(weight);
                          return (
                            <button
                              key={weight}
                              type="button"
                              aria-pressed={on}
                              onClick={() =>
                                setPicked((current) =>
                                  on
                                    ? current.filter((w) => w !== weight)
                                    : [...current, weight].sort((a, b) => a - b),
                                )
                              }
                              className={cn(
                                "rounded-lg border px-2 py-1 text-xs transition-colors",
                                on
                                  ? "border-violet/60 bg-violet/20 text-fg"
                                  : "border-line text-muted hover:text-fg",
                              )}
                            >
                              {weight}
                              <span className="ml-1 text-[10px] opacity-70">
                                {WEIGHT_LABELS[weight]}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        disabled={pending || !picked.length}
                        onClick={() =>
                          apply(() =>
                            addGoogleFont({
                              family: font.family,
                              weights: picked,
                              category: font.category,
                            }),
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-fg px-4 py-2 text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {pending ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                        ) : (
                          <Plus className="size-4" aria-hidden />
                        )}
                        Add {font.family}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}

            {!searching && !results.length && (
              <li className="px-1 py-6 text-center text-sm text-muted">
                No families match “{query}”.
              </li>
            )}
          </ul>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="Font name" hint={<span className="text-xs">CSS family name</span>}>
            <input
              value={custom.family}
              onChange={(e) => setCustom({ ...custom, family: e.target.value })}
              placeholder="Satoshi"
              className={fieldClass}
            />
          </Field>

          <Field
            label="Font file or stylesheet URL"
            hint={<span className="text-xs">https · .woff2 .woff .ttf .otf .css</span>}
          >
            <input
              value={custom.url}
              onChange={(e) => setCustom({ ...custom, url: e.target.value })}
              placeholder="https://cdn.example.com/satoshi-regular.woff2"
              aria-invalid={!customUrlValid}
              className={cn(
                fieldClass,
                !customUrlValid && "border-red-400/60 focus:border-red-400",
              )}
            />
          </Field>
          {!customUrlValid && (
            <p className="flex items-center gap-1.5 text-xs text-red-400">
              <AlertCircle className="size-3.5" aria-hidden />
              Must be an https URL ending in a font or stylesheet extension.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Weight">
              <select
                value={custom.weight}
                onChange={(e) => setCustom({ ...custom, weight: Number(e.target.value) })}
                className={fieldClass}
              >
                {WEIGHT_ORDER.map((weight) => (
                  <option key={weight} value={weight}>
                    {weight} · {WEIGHT_LABELS[weight]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Style">
              <select
                value={custom.style}
                onChange={(e) =>
                  setCustom({ ...custom, style: e.target.value === "italic" ? "italic" : "normal" })
                }
                className={fieldClass}
              >
                <option value="normal">Normal</option>
                <option value="italic">Italic</option>
              </select>
            </Field>
            <Field label="Fallback">
              <select
                value={custom.fallback}
                onChange={(e) => setCustom({ ...custom, fallback: e.target.value })}
                className={fieldClass}
              >
                <option value="sans-serif">sans-serif</option>
                <option value="serif">serif</option>
                <option value="monospace">monospace</option>
                <option value="cursive">cursive</option>
              </select>
            </Field>
          </div>

          <button
            type="button"
            disabled={pending || !custom.family.trim() || !isSafeFontUrl(custom.url.trim())}
            onClick={() => apply(() => addCustomFont(custom))}
            className="inline-flex items-center gap-2 rounded-xl bg-fg px-4 py-2 text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Plus className="size-4" aria-hidden />
            )}
            Add font
          </button>
        </div>
      )}

      {feedback && (
        <p
          role="status"
          className={cn(
            "mt-4 flex items-center gap-2 text-sm",
            feedback.ok ? "text-cyan" : "text-red-400",
          )}
        >
          {feedback.ok ? (
            <Check className="size-4" aria-hidden />
          ) : (
            <AlertCircle className="size-4" aria-hidden />
          )}
          {feedback.message}
        </p>
      )}

      {library.length > 0 && (
        <div className="mt-6 border-t border-line pt-4">
          <h3 className="mb-2 text-sm font-medium text-fg">
            In your library ({library.length})
          </h3>
          <ul className="space-y-1">
            {library.map((font) => (
              <li
                key={font.id}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-white/5"
              >
                <span className="min-w-0">
                  <span
                    className="block truncate text-sm text-fg"
                    style={{ fontFamily: `"${font.family}", ${font.fallback}` }}
                  >
                    {font.family}
                  </span>
                  <span className="font-mono text-[11px] text-muted">
                    {font.source} · {font.weights.join(", ")}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={pending}
                  aria-label={`Remove ${font.family}`}
                  onClick={() => apply(() => removeFont(font.id))}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-red-500/20 hover:text-red-300"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">
            Removing a font stops it loading. Articles that used it fall back to the next
            family in the stack — no published page breaks.
          </p>
        </div>
      )}
    </Modal>
  );
}
