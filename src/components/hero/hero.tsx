"use client";

import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, Download, Mail, FolderOpen } from "lucide-react";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { Typewriter } from "@/components/hero/typewriter";
import { SITE } from "@/lib/utils";

// 3D scene is client-only and code-split so it never blocks first paint.
const HeroScene = dynamic(() => import("@/components/hero/hero-scene"), {
  ssr: false,
});

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } },
};
const item = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.21, 0.6, 0.35, 1] as const },
  },
};

export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section id="home" className="relative flex min-h-svh items-center overflow-hidden">
      {/* 3D particle constellation */}
      {!reduce && (
        <div className="absolute inset-0" aria-hidden>
          <HeroScene />
        </div>
      )}

      {/* aurora blobs behind content */}
      <div className="aurora" aria-hidden>
        <i className="left-[10%] top-[15%] h-96 w-96" style={{ "--blob": "rgba(124,92,255,0.5)" } as React.CSSProperties} />
        <i className="right-[5%] top-[40%] h-80 w-80 [animation-delay:-5s]" style={{ "--blob": "rgba(77,124,254,0.45)" } as React.CSSProperties} />
        <i className="bottom-[10%] left-[35%] h-72 w-72 [animation-delay:-9s]" style={{ "--blob": "rgba(34,211,238,0.35)" } as React.CSSProperties} />
      </div>

      {/* fade to page background at the bottom */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent" />

      <motion.div
        variants={container}
        initial={reduce ? false : "hidden"}
        animate="show"
        className="relative z-10 mx-auto max-w-5xl px-6 text-center"
      >
        <motion.p variants={item} className="eyebrow mb-6">
          Portfolio — 2026
        </motion.p>

        <motion.h1
          variants={item}
          className="text-5xl font-semibold tracking-tighter sm:text-7xl md:text-8xl"
        >
          <span className="g-text">{SITE.name}</span>
        </motion.h1>

        <motion.p variants={item} className="mt-5 text-lg text-muted sm:text-xl">
          {SITE.role}
        </motion.p>

        <motion.div variants={item} className="mt-4 h-7">
          <Typewriter
            phrases={[
              "AI • Machine Learning",
              "Full Stack Development",
              "Problem Solver",
              "Building real-world products",
            ]}
          />
        </motion.div>

        <motion.div
          variants={item}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <MagneticButton href="#projects">
            <FolderOpen className="size-4" /> View Projects
          </MagneticButton>
          <MagneticButton href="#contact" variant="ghost">
            <Mail className="size-4" /> Contact Me
          </MagneticButton>
          <MagneticButton href="/resume.pdf" variant="ghost" download>
            <Download className="size-4" /> Download Resume
          </MagneticButton>
        </motion.div>
      </motion.div>

      {/* scroll hint */}
      <motion.a
        href="#about"
        aria-label="Scroll to about section"
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-muted"
        animate={reduce ? undefined : { y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      >
        <ArrowDown className="size-5" />
      </motion.a>
    </section>
  );
}
