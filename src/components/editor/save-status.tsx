"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, CloudOff, Loader2, PenLine } from "lucide-react";
import type { Autosave, SaveStatus } from "@/lib/editor/use-autosave";
import { cn } from "@/lib/utils";

/**
 * The autosave badge.
 *
 * It says one of four true things and never bluffs: no "Saved" that means
 * "queued", and no spinner that means "waiting for a debounce". When autosave is
 * off — which it is for published articles, so a live page never picks up
 * half-finished edits — it says that instead of pretending to be idle.
 */

const LABELS: Record<SaveStatus, { text: string; icon: typeof Check; className: string }> = {
  saved: { text: "Saved", icon: Check, className: "text-cyan" },
  unsaved: { text: "Unsaved changes", icon: PenLine, className: "text-amber-400" },
  saving: { text: "Saving…", icon: Loader2, className: "text-muted" },
  failed: { text: "Autosave failed", icon: AlertCircle, className: "text-red-400" },
};

export function SaveStatusBadge({
  autosave,
  enabled,
  /** Why autosave is off, when it is. */
  disabledReason,
}: {
  autosave: Autosave;
  enabled: boolean;
  disabledReason?: string;
}) {
  const ago = useRelativeTime(autosave.savedAt);

  if (!enabled) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted" role="status">
        <CloudOff className="size-3.5 shrink-0" aria-hidden />
        {autosave.status === "unsaved" || autosave.status === "failed"
          ? "Unsaved changes"
          : "Autosave off"}
        {disabledReason && <span className="hidden sm:inline">— {disabledReason}</span>}
      </p>
    );
  }

  const { text, icon: Icon, className } = LABELS[autosave.status];

  return (
    <p className={cn("flex items-center gap-1.5 text-xs", className)} role="status">
      <Icon
        className={cn("size-3.5 shrink-0", autosave.status === "saving" && "animate-spin")}
        aria-hidden
      />
      {text}
      {autosave.status === "saved" && ago && (
        <span className="text-muted">{ago}</span>
      )}
      {autosave.status === "failed" && autosave.message && (
        <span className="text-muted">— {autosave.message}</span>
      )}
    </p>
  );
}

/** "just now" / "3 min ago", re-rendered on a slow tick. */
function useRelativeTime(at: Date | null): string {
  const [, tick] = useState(0);

  useEffect(() => {
    if (!at) return;
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [at]);

  if (!at) return "";
  const minutes = Math.floor((Date.now() - at.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 min ago";
  if (minutes < 60) return `${minutes} min ago`;
  return at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
