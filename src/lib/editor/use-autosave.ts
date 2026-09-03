"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Debounced autosave with an honest status.
 *
 * The four states the UI shows map to four real situations, and none of them is
 * cosmetic:
 *
 *   - `saved` — the server confirmed this exact snapshot.
 *   - `unsaved` — the draft differs from what the server has, and a save is queued.
 *   - `saving` — a request is in flight.
 *   - `failed` — the server refused or the request died. The message says why,
 *     and nothing retries in a loop behind the author's back.
 *
 * `saving` is not a lie about a queued request either: the debounce timer is
 * `unsaved`, and the status only becomes `saving` once the action is called.
 *
 * The comparison key is a serialisation of the snapshot, so a change that
 * round-trips back to the saved value (type a word, delete it) correctly returns
 * to `saved` rather than leaving a permanent "unsaved" badge.
 */

export type SaveStatus = "saved" | "unsaved" | "saving" | "failed";

export type SaveOutcome = { ok: true } | { ok: false; message: string };

export type Autosave = {
  status: SaveStatus;
  /** Populated on `failed`. */
  message: string;
  /** When the last confirmed save landed, for a "saved 2 min ago" line. */
  savedAt: Date | null;
  /** Flush the pending change immediately. */
  saveNow: () => void;
  /** Treat the current snapshot as saved — call after a manual save succeeds. */
  markClean: () => void;
};

export function useAutosave<T>({
  data,
  save,
  enabled = true,
  delay = 2000,
}: {
  /** Anything JSON-serialisable. Identity does not matter; content does. */
  data: T;
  save: (data: T) => Promise<SaveOutcome>;
  enabled?: boolean;
  delay?: number;
}): Autosave {
  const key = JSON.stringify(data);

  const [status, setStatus] = useState<SaveStatus>("saved");
  const [message, setMessage] = useState("");
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  // Refs, not state: these are read inside timers and async callbacks, where a
  // stale closure would either save the wrong snapshot or skip a save entirely.
  const savedKey = useRef(key);
  const latest = useRef({ key, data });
  const saveFn = useRef(save);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);

  latest.current = { key, data };
  saveFn.current = save;

  const run = useCallback(async () => {
    if (inFlight.current) return;
    const { key: attemptKey, data: attemptData } = latest.current;
    if (attemptKey === savedKey.current) return;

    inFlight.current = true;
    setStatus("saving");
    setMessage("");

    let outcome: SaveOutcome;
    try {
      outcome = await saveFn.current(attemptData);
    } catch {
      outcome = { ok: false, message: "Autosave could not reach the server." };
    }
    inFlight.current = false;

    if (!outcome.ok) {
      setStatus("failed");
      setMessage(outcome.message);
      return;
    }

    savedKey.current = attemptKey;
    setSavedAt(new Date());
    // The document may have moved on while the request was in flight; saying
    // "saved" then would describe a snapshot that is already history.
    setStatus(latest.current.key === attemptKey ? "saved" : "unsaved");
  }, []);

  /* Schedule a save whenever the snapshot differs from what is stored. */
  useEffect(() => {
    if (key === savedKey.current) {
      // Only clear a *pending* state; a failure stays visible until the next
      // edit gives it something new to try.
      setStatus((prev) => (prev === "unsaved" ? "saved" : prev));
      return;
    }

    setStatus((prev) => (prev === "saving" ? prev : "unsaved"));
    if (!enabled) return;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void run(), delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [key, enabled, delay, run]);

  /* Warn before leaving with work the server has not acknowledged. */
  useEffect(() => {
    if (status === "saved") return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Browsers ignore the string and show their own copy, but assigning it is
      // still what triggers the dialog in some engines.
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status]);

  const saveNow = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    void run();
  }, [run]);

  const markClean = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    savedKey.current = latest.current.key;
    setSavedAt(new Date());
    setStatus("saved");
    setMessage("");
  }, []);

  return { status, message, savedAt, saveNow, markClean };
}
