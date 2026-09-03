"use client";

import { useMemo } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { scrubForPreview } from "@/lib/content/scrub-client";
import { SITE } from "@/lib/site";
import { formatCount, statsFromHtml } from "@/lib/content/stats";
import { cn } from "@/lib/utils";

/**
 * The Preview half of the editor's Edit | Preview switch.
 *
 * It renders through `scrubForPreview`, the browser mirror of the server
 * sanitiser, so the preview cannot show markup the published page would strip.
 * That matters more than it sounds: previewing the *raw* editor HTML would
 * quietly promise an author that a pasted `<iframe>` survives publishing.
 *
 * The mobile width is a real 390px column rather than a scaled-down screenshot,
 * so line breaks, heading wraps and image widths behave exactly as they will on
 * a phone.
 */

export type PreviewWidth = "desktop" | "mobile";

/** iPhone-class logical width — the narrowest layout worth designing for. */
const WIDTHS: Record<PreviewWidth, string> = {
  desktop: "100%",
  mobile: "390px",
};

export function PreviewWidthToggle({
  value,
  onChange,
}: {
  value: PreviewWidth;
  onChange: (value: PreviewWidth) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Preview width"
      className="inline-flex items-center gap-0.5 rounded-xl border border-line p-0.5"
    >
      {(
        [
          ["desktop", "Desktop width", Monitor],
          ["mobile", "Mobile width", Smartphone],
        ] as const
      ).map(([key, label, Icon]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-pressed={value === key}
          title={label}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-[0.6rem] px-2.5 py-1 text-xs transition-colors",
            value === key ? "bg-fg text-ink" : "text-muted hover:text-fg",
          )}
        >
          <Icon className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">{key === "desktop" ? "Desktop" : "Mobile"}</span>
          <span className="sr-only sm:hidden">{label}</span>
        </button>
      ))}
    </div>
  );
}

export function ArticlePreview({
  html,
  title,
  width,
}: {
  html: string;
  title: string;
  width: PreviewWidth;
}) {
  const safe = useMemo(() => scrubForPreview(html), [html]);
  const stats = useMemo(() => statsFromHtml(html), [html]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Rendered with the same sanitiser and typography as the published page.
        Anything the sanitiser removes is missing here too.
      </p>

      <div className="overflow-x-auto rounded-2xl border border-line bg-ink-2 p-4 sm:p-6">
        <div
          className="mx-auto transition-[max-width] duration-200"
          style={{ maxWidth: WIDTHS[width] }}
        >
          <article>
            <header className="mb-6 border-b border-line pb-5">
              <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
                {title.trim() || "Untitled article"}
              </h1>
              <p className="mt-2 text-xs text-muted">
                {formatCount(stats.words)} words
                {stats.readingLabel && ` · ${stats.readingLabel}`}
              </p>
            </header>

            {safe ? (
              <div
                className="prose-article"
                // Scrubbed above by the client mirror of the server sanitiser.
                dangerouslySetInnerHTML={{ __html: safe }}
              />
            ) : (
              <p className="text-sm text-muted">
                Nothing to preview yet — write something in the Edit tab.
              </p>
            )}
          </article>
        </div>
      </div>

      <p className="text-xs text-muted">
        Published at {SITE.url}/blog/… — the live page adds the byline, tags and
        navigation.
      </p>
    </div>
  );
}
