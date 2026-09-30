"use client";

import { ReactNode, useState } from "react";
import { Navbar } from "@/components/chrome/navbar";
import { CommandPalette } from "@/components/chrome/command-palette";
import { Cursor } from "@/components/chrome/cursor";
import { LoadingScreen } from "@/components/chrome/loading-screen";
import { BackToTop } from "@/components/chrome/back-to-top";

/** Client shell wrapping the page: nav, palette, cursor, loader, back-to-top. */
export function Shell({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <>
      <LoadingScreen />
      <Cursor />
      <Navbar onOpenPalette={() => setPaletteOpen(true)} />
      <CommandPalette open={paletteOpen} setOpen={setPaletteOpen} />
      <main>{children}</main>
      <BackToTop />
    </>
  );
}
