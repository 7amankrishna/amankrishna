"use client";

import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { MouseEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Button that gently pulls toward the cursor while hovered.
 * Falls back to a static button under reduced motion / touch.
 */
export function MagneticButton({
  children,
  className,
  href,
  onClick,
  variant = "primary",
  download,
}: {
  children: ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "ghost";
  download?: boolean;
}) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 300, damping: 20 });
  const sy = useSpring(y, { stiffness: 300, damping: 20 });

  const onMove = (e: MouseEvent<HTMLElement>) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width / 2) * 0.3);
    y.set((e.clientY - r.top - r.height / 2) * 0.3);
  };
  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  const styles = cn(
    "inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-colors",
    variant === "primary"
      ? "bg-fg text-ink hover:opacity-90"
      : "glass text-fg hover:border-violet/60",
    className,
  );

  const inner = (
    <motion.span
      style={{ x: sx, y: sy }}
      className="inline-flex items-center gap-2"
    >
      {children}
    </motion.span>
  );

  if (href) {
    const external = href.startsWith("http");
    return (
      <a
        href={href}
        download={download}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className={styles}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
      >
        {inner}
      </a>
    );
  }
  return (
    <button className={styles} onClick={onClick} onMouseMove={onMove} onMouseLeave={onLeave}>
      {inner}
    </button>
  );
}
