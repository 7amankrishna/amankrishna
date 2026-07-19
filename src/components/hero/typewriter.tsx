"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

/** Looping typewriter over a list of phrases, with blinking caret. */
export function Typewriter({ phrases }: { phrases: string[] }) {
  const reduce = useReducedMotion();
  const [text, setText] = useState(reduce ? phrases[0] : "");
  const [i, setI] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (reduce) return;
    const current = phrases[i % phrases.length];
    const done = !deleting && text === current;
    const empty = deleting && text === "";

    const delay = done ? 2000 : deleting ? 30 : 65;
    const t = setTimeout(() => {
      if (done) setDeleting(true);
      else if (empty) {
        setDeleting(false);
        setI((v) => v + 1);
      } else {
        setText(current.slice(0, text.length + (deleting ? -1 : 1)));
      }
    }, delay);
    return () => clearTimeout(t);
  }, [text, deleting, i, phrases, reduce]);

  return (
    <span className="font-mono text-sm text-muted sm:text-base" aria-label={phrases.join(", ")}>
      <span aria-hidden>{text}</span>
      <span aria-hidden className="animate-blink text-cyan">
        ▍
      </span>
    </span>
  );
}
