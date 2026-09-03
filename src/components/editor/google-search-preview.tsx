"use client";

import { Info } from "lucide-react";
import { breadcrumbUrl } from "@/lib/seo/fields";
import { SITE } from "@/lib/site";

/**
 * An approximation of a Google desktop result.
 *
 * Two things keep this honest:
 *
 *   1. It is labelled approximate, prominently, because it is. Google truncates
 *      on *rendered pixel width* in a font we are not using, rewrites titles it
 *      dislikes, and frequently replaces the meta description with a passage
 *      lifted from the body. No preview can promise otherwise.
 *   2. Overflow is handled by CSS line clamping rather than by cutting the
 *      string. The author's text is shown as written; what the clamp hides is
 *      shown as hidden, not deleted.
 *
 * The date comes from the article's real `published_at` and is simply absent on
 * a draft — inventing "today" here would be the same lie as a faked `lastmod`.
 */

export function GoogleSearchPreview({
  title,
  description,
  slug,
  publishedAt,
  noindex,
}: {
  /** Already resolved through the fallback chain. */
  title: string;
  description: string;
  slug: string;
  publishedAt?: string | null;
  noindex?: boolean;
}) {
  const path = `${SITE.blog.base}/${slug || "…"}`;
  const date = formatResultDate(publishedAt);

  return (
    <section aria-label="Approximate Google result" className="space-y-2">
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-medium">Google result</h3>
        <span className="rounded-full border border-line px-2 py-0.5 text-[0.65rem] uppercase tracking-wide text-muted">
          Approximate
        </span>
      </header>

      {/*
        Light card on purpose: the site is dark by default, and judging a
        search snippet against the wrong background is how authors end up
        writing for a result page that does not exist.
      */}
      <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
        <div className="max-w-[600px]">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f1f3f4] text-[0.7rem] font-semibold text-[#5f6368]"
            >
              AK
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[0.8rem] leading-tight text-[#202124]">
                {SITE.name}
              </span>
              <span className="block truncate text-[0.75rem] leading-tight text-[#4d5156]">
                {breadcrumbUrl(SITE.host, path)}
              </span>
            </span>
          </div>

          <p className="mt-2 line-clamp-2 text-[1.25rem] leading-snug text-[#1a0dab]">
            {title || "Untitled article"}
          </p>

          <p className="mt-1 line-clamp-2 text-[0.875rem] leading-[1.58] text-[#4d5156]">
            {date && <span className="text-[#70757a]">{date} — </span>}
            {description || "No meta description yet — Google will pick a passage from the article instead."}
          </p>
        </div>
      </div>

      <p className="flex items-start gap-1.5 text-xs text-muted">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          Google cuts titles and snippets by pixel width, not character count,
          and often rewrites both — treat this as a sanity check, not a
          guarantee.
          {noindex && (
            <>
              {" "}
              <strong className="font-medium text-amber-400">
                This article is set to noindex, so it will not appear in results
                at all.
              </strong>
            </>
          )}
        </span>
      </p>
    </section>
  );
}

/** "4 Sept 2026", the way a result line shows it. Empty for a draft. */
function formatResultDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
