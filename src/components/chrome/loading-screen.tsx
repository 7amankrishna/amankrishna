"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SITE } from "@/lib/utils";

/** Brief branded loading screen shown once on first paint. */
export function LoadingScreen() {
  const reduce = useReducedMotion();
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDone(true), reduce ? 0 : 1400);
    return () => clearTimeout(t);
  }, [reduce]);

  // While visible, keep the page from scrolling underneath.
  useEffect(() => {
    document.documentElement.style.overflow = done ? "" : "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [done]);

  if (done && reduce) return null;

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[100] flex flex-col items-center justify-center bg-ink"
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
          aria-hidden
        >
          <motion.p
            className="g-text font-mono text-2xl font-semibold tracking-tight"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {SITE.name.toLowerCase().replace(" ", ".")}
          </motion.p>
          <motion.div
            className="mt-6 h-px w-40 origin-left bg-gradient-to-r from-violet to-cyan"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.1, ease: "easeInOut" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
