"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { useTheme } from "next-themes";
import { Moon, Sun, Command } from "lucide-react";
import { cn, SITE } from "@/lib/utils";

const links = [
  { href: "#about", label: "About" },
  { href: "#skills", label: "Skills" },
  { href: "#projects", label: "Projects" },
  { href: "#experience", label: "Journey" },
  { href: "#github", label: "GitHub" },
  { href: "#contact", label: "Contact" },
];

/** Fixed navbar with scroll progress bar, theme toggle and ⌘K hint. */
export function Navbar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "glass rounded-none border-x-0 border-t-0" : "bg-transparent",
      )}
    >
      {/* scroll progress indicator */}
      <motion.div
        className="absolute inset-x-0 top-0 h-0.5 origin-left bg-gradient-to-r from-violet via-blue to-cyan"
        style={{ scaleX: progress }}
      />

      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#home" className="font-mono text-sm font-semibold tracking-tight">
          {SITE.name.split(" ")[0].toLowerCase()}
          <span className="text-violet">.dev</span>
        </a>

        <ul className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="text-sm text-muted transition-colors hover:text-fg"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenPalette}
            aria-label="Open command palette"
            className="glass hidden items-center gap-2 px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:text-fg sm:flex"
          >
            <Command className="size-3" /> K
          </button>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
            className="glass flex size-9 items-center justify-center text-muted transition-colors hover:text-fg"
          >
            {mounted && theme === "light" ? (
              <Moon className="size-4" />
            ) : (
              <Sun className="size-4" />
            )}
          </button>
        </div>
      </nav>
    </header>
  );
}
