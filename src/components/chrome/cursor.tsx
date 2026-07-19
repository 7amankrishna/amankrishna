"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";

/**
 * Custom cursor: a dot that tracks the pointer 1:1 and a trailing ring
 * that springs behind it, growing over interactive elements.
 * Renders nothing on touch devices or under reduced motion.
 */
export function Cursor() {
  const reduce = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 250, damping: 25 });
  const ringY = useSpring(y, { stiffness: 250, damping: 25 });

  useEffect(() => {
    if (reduce || !window.matchMedia("(pointer: fine)").matches) return;
    setEnabled(true);
    document.body.classList.add("custom-cursor-on");

    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const t = e.target as HTMLElement;
      setHovering(!!t.closest("a, button, [role=button], input, textarea"));
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      document.body.classList.remove("custom-cursor-on");
    };
  }, [reduce, x, y]);

  if (!enabled) return null;

  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[90] size-2 rounded-full bg-cyan"
        style={{ x, y, translateX: "-50%", translateY: "-50%" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[90] rounded-full border border-violet/60"
        style={{ x: ringX, y: ringY, translateX: "-50%", translateY: "-50%" }}
        animate={{ width: hovering ? 44 : 28, height: hovering ? 44 : 28, opacity: hovering ? 1 : 0.6 }}
        transition={{ duration: 0.2 }}
      />
    </>
  );
}
