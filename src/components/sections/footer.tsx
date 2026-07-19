"use client";

import { motion } from "framer-motion";
import { Mail, Heart } from "lucide-react";
import { Github, Linkedin } from "@/components/ui/brand-icons";
import { SITE } from "@/lib/utils";

const socials = [
  { icon: Github, href: SITE.github, label: "GitHub" },
  { icon: Linkedin, href: SITE.linkedin, label: "LinkedIn" },
  { icon: Mail, href: `mailto:${SITE.email}`, label: "Email" },
];

export function Footer() {
  return (
    <footer className="relative border-t border-line">
      {/* thin animated gradient edge */}
      <div className="absolute inset-x-0 top-0 h-px overflow-hidden" aria-hidden>
        <div className="animate-marquee h-full w-[200%] bg-[linear-gradient(90deg,transparent,#7c5cff,#22d3ee,transparent,transparent,#7c5cff,#22d3ee,transparent)]" />
      </div>

      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-12 sm:flex-row sm:justify-between">
        <p className="font-mono text-sm text-muted">
          © {new Date().getFullYear()} {SITE.name}
        </p>

        <div className="flex gap-3">
          {socials.map((s) => (
            <motion.a
              key={s.label}
              href={s.href}
              aria-label={s.label}
              target={s.href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              whileHover={{ y: -3 }}
              className="glass flex size-10 items-center justify-center text-muted transition-colors hover:text-fg"
            >
              <s.icon className="size-4" />
            </motion.a>
          ))}
        </div>

        <p className="flex items-center gap-1.5 font-mono text-sm text-muted">
          Built with <Heart className="size-3.5 fill-violet text-violet" /> using
          Next.js + TypeScript
        </p>
      </div>
    </footer>
  );
}
