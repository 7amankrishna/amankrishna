"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="aurora" aria-hidden>
        <i className="left-[20%] top-[20%] h-80 w-80" style={{ "--blob": "rgba(124,92,255,0.5)" } as React.CSSProperties} />
        <i className="bottom-[15%] right-[15%] h-72 w-72 [animation-delay:-6s]" style={{ "--blob": "rgba(34,211,238,0.35)" } as React.CSSProperties} />
      </div>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="g-text font-mono text-8xl font-bold sm:text-9xl"
      >
        404
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-4 text-lg text-muted"
      >
        This page drifted out of the constellation.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mt-8"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-fg px-6 py-3 text-sm font-medium text-ink transition-colors hover:opacity-90"
        >
          <Home className="size-4" /> Back home
        </Link>
      </motion.div>
    </main>
  );
}
