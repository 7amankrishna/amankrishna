"use client";

import { AlertTriangle, Check as CheckIcon, Info } from "lucide-react";
import type { Check, CheckStatus } from "@/lib/seo/checklist";
import { countWarnings } from "@/lib/seo/checklist";
import { cn } from "@/lib/utils";

/**
 * The checklist, rendered.
 *
 * No score, no progress bar, no colour-graded letter. Just the items, with the
 * ones worth attention first — and a summary line that counts them rather than
 * grading them. Every item is advisory: the Save button does not read this
 * component's state, and it never will.
 */

const STYLES: Record<CheckStatus, { icon: typeof CheckIcon; className: string }> = {
  pass: { icon: CheckIcon, className: "text-cyan" },
  warn: { icon: AlertTriangle, className: "text-amber-400" },
  info: { icon: Info, className: "text-muted" },
};

/** Warnings first, then info, then passes — attention where it is needed. */
const ORDER: Record<CheckStatus, number> = { warn: 0, info: 1, pass: 2 };

export function SeoChecklist({ checks }: { checks: Check[] }) {
  const warnings = countWarnings(checks);
  const sorted = [...checks].sort((a, b) => ORDER[a.status] - ORDER[b.status]);

  return (
    <section aria-label="SEO checklist" className="space-y-3">
      <header className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h3 className="text-sm font-medium">Checklist</h3>
        <p className="text-xs text-muted">
          {warnings === 0
            ? "Nothing flagged."
            : `${warnings} ${warnings === 1 ? "item" : "items"} worth a look — none of them block publishing.`}
        </p>
      </header>

      <ul className="space-y-2">
        {sorted.map((check) => {
          const { icon: Icon, className } = STYLES[check.status];
          return (
            <li key={check.id} className="flex items-start gap-2.5 text-sm">
              <Icon className={cn("mt-0.5 size-4 shrink-0", className)} aria-hidden />
              <span className="min-w-0">
                <span className={cn(check.status === "pass" && "text-muted")}>
                  {check.label}
                </span>
                {check.detail && (
                  <span className="mt-0.5 block text-xs text-muted">{check.detail}</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
