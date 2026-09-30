"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { useTheme } from "next-themes";
import { Command } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PortfolioSettings } from "@/lib/portfolio-types";

const links = [
  { href: "#about", label: "About" },
  { href: "#skills", label: "Skills" },
  { href: "#projects", label: "Projects" },
  { href: "#experience", label: "Journey" },
  { href: "/blog", label: "Blog" },
  { href: "#contact", label: "Contact" },
];

/** Quiet editorial navigation with an explicit light/dark/system cycle. */
export function Navbar({ onOpenPalette, settings }: { onOpenPalette: () => void; settings?: PortfolioSettings }) {
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
        scrolled ? "border-b border-line bg-[color-mix(in_srgb,var(--bg)_92%,transparent)] backdrop-blur-md" : "bg-transparent",
      )}
    >
      {/* scroll progress indicator */}
      <motion.div
        className="absolute inset-x-0 top-0 h-0.5 origin-left bg-accent"
        style={{ scaleX: progress }}
      />

      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#home" className="font-mono text-sm font-semibold tracking-tight">
          {settings?.profile.name || "aman"}<span className="text-accent">/</span>digital lab
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
          {settings?.hero.status && <span className="hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted lg:flex"><span className="size-1.5 rounded-full bg-accent" aria-hidden />{settings.hero.status}</span>}
          <button
            onClick={onOpenPalette}
            aria-label="Open command palette"
            className="hidden items-center gap-2 border border-line px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:text-fg sm:flex"
          >
            <Command className="size-3" /> K
          </button>
          <select aria-label="Color theme" value={mounted ? theme : "system"} onChange={(e) => setTheme(e.target.value)} className="border border-line bg-ink px-2 py-2 font-mono text-[10px] text-fg"><option value="light">LIGHT</option><option value="dark">DARK</option><option value="system">SYSTEM</option></select>
          <details className="relative md:hidden"><summary className="cursor-pointer px-2 py-2 text-xs">Menu</summary><ul className="absolute right-0 top-full w-44 border border-line bg-ink p-3">{links.map((l) => <li key={l.href}><a className="block p-2 text-sm" href={l.href}>{l.label}</a></li>)}</ul></details>
        </div>
      </nav>
    </header>
  );
}
