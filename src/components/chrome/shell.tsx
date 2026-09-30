"use client";

import { ReactNode, useState } from "react";
import { Navbar } from "@/components/chrome/navbar";
import { CommandPalette } from "@/components/chrome/command-palette";
import { BackToTop } from "@/components/chrome/back-to-top";
import type { PortfolioSettings } from "@/lib/portfolio-types";

/** Client shell wrapping the page: nav, palette, cursor, loader, back-to-top. */
export function Shell({ children, settings }: { children: ReactNode; settings?: PortfolioSettings }) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-ink focus:p-4">Skip to content</a>
      <Navbar settings={settings} onOpenPalette={() => setPaletteOpen(true)} />
      <CommandPalette open={paletteOpen} setOpen={setPaletteOpen} />
      <main id="main-content">{children}</main>
      <BackToTop />
    </>
  );
}
