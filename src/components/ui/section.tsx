"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Section shell: consistent padding, eyebrow label + heading,
 * and a scroll-triggered staggered reveal for its children.
 */
export function Section({
  id,
  eyebrow,
  title,
  children,
  className,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <section id={id} className={cn("relative mx-auto max-w-6xl px-6 py-28", className)}>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.21, 0.6, 0.35, 1] }}
      >
        <p className="eyebrow mb-3">{eyebrow}</p>
        <h2 className="mb-12 text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h2>
      </motion.div>
      <Stagger>{children}</Stagger>
    </section>
  );
}

/** Staggers direct children in on scroll. */
export function Stagger({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? undefined : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      variants={{ show: { transition: { staggerChildren: 0.08 } } }}
    >
      {children}
    </motion.div>
  );
}

/** A single item inside <Stagger>. */
export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 24 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5, ease: [0.21, 0.6, 0.35, 1] },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
