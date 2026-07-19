"use client";

import { useEffect } from "react";
import { Command } from "cmdk";
import {
  Home,
  User,
  Sparkles,
  FolderOpen,
  Map,
  Mail,
  Download,
  Moon,
  Sun,
} from "lucide-react";
import { Github, Linkedin } from "@/components/ui/brand-icons";
import { useTheme } from "next-themes";
import { SITE } from "@/lib/utils";

/**
 * ⌘K / Ctrl+K command palette: jump to sections, open socials,
 * download resume, toggle theme. Doubles as site search.
 */
export function CommandPalette({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, setOpen]);

  const go = (href: string) => {
    setOpen(false);
    if (href.startsWith("#")) {
      document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    } else {
      window.open(href, "_blank", "noopener,noreferrer");
    }
  };

  const sections = [
    { icon: Home, label: "Home", href: "#home" },
    { icon: User, label: "About", href: "#about" },
    { icon: Sparkles, label: "Skills", href: "#skills" },
    { icon: FolderOpen, label: "Projects", href: "#projects" },
    { icon: Map, label: "Journey", href: "#experience" },
    { icon: Mail, label: "Contact", href: "#contact" },
  ];

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      overlayClassName="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
      contentClassName="fixed left-1/2 top-28 z-[80] w-[90vw] max-w-lg -translate-x-1/2"
      className="overflow-hidden rounded-2xl border border-line bg-ink-2/95 shadow-2xl shadow-violet/10 backdrop-blur-xl"
    >
      <Command.Input
        placeholder="Search sections, links, actions…"
        className="w-full border-b border-line bg-transparent px-5 py-4 text-sm text-fg outline-none placeholder:text-muted/60"
      />
      <Command.List className="max-h-72 overflow-y-auto p-2">
        <Command.Empty className="p-4 text-center text-sm text-muted">
          Nothing found — try a section name.
        </Command.Empty>

        <Command.Group
          heading="Navigate"
          className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted"
        >
          {sections.map((s) => (
            <Command.Item
              key={s.href}
              onSelect={() => go(s.href)}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-fg data-[selected=true]:bg-violet/15"
            >
              <s.icon className="size-4 text-muted" /> {s.label}
            </Command.Item>
          ))}
        </Command.Group>

        <Command.Group
          heading="Links & actions"
          className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted"
        >
          <Command.Item
            onSelect={() => go(SITE.github)}
            className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm data-[selected=true]:bg-violet/15"
          >
            <Github className="size-4 text-muted" /> Open GitHub
          </Command.Item>
          <Command.Item
            onSelect={() => go(SITE.linkedin)}
            className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm data-[selected=true]:bg-violet/15"
          >
            <Linkedin className="size-4 text-muted" /> Open LinkedIn
          </Command.Item>
          <Command.Item
            onSelect={() => go("/resume.pdf")}
            className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm data-[selected=true]:bg-violet/15"
          >
            <Download className="size-4 text-muted" /> Download resume
          </Command.Item>
          <Command.Item
            onSelect={() => {
              setTheme(theme === "dark" ? "light" : "dark");
              setOpen(false);
            }}
            className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm data-[selected=true]:bg-violet/15"
          >
            {theme === "dark" ? (
              <Sun className="size-4 text-muted" />
            ) : (
              <Moon className="size-4 text-muted" />
            )}
            Toggle theme
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
