"use client";

import { ReactNode, useEffect } from "react";
import { ThemeProvider } from "next-themes";
import Lenis from "lenis";

/**
 * Global client providers: persisted light/dark/system theme + Lenis scrolling.
 * Lenis is skipped when the user prefers reduced motion.
 */
export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({ lerp: 0.12 });
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="aman-digital-lab-theme"
      value={{ dark: "dark", light: "light", system: "system" }}
    >
      {children}
    </ThemeProvider>
  );
}
