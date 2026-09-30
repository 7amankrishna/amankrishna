"use client";

import { Section, StaggerItem } from "@/components/ui/section";
import { TiltCard } from "@/components/ui/tilt-card";
import { SITE } from "@/lib/utils";
import { GraduationCap, Brain, Rocket, Code2 } from "lucide-react";

const highlights = [
  {
    icon: GraduationCap,
    title: "B.Tech CSE Student",
    body: "Building a strong foundation in computer science — algorithms, systems, and software engineering.",
  },
  {
    icon: Brain,
    title: "AI & Machine Learning",
    body: "Passionate about AI. Exploring machine learning, LLM APIs, and prompt engineering to build intelligent products.",
  },
  {
    icon: Code2,
    title: "Full Stack Development",
    body: "Shipping end-to-end with React, Next.js, Node.js and Supabase — from database schema to polished UI.",
  },
  {
    icon: Rocket,
    title: "Startups & Products",
    body: "Interested in startups and modern web technologies. Focused on building real-world products people actually use.",
  },
];

export function About() {
  return (
    <Section id="about" eyebrow="01 — About" title="Engineer in the making.">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,340px)_1fr]">
        {/* animated profile card */}
        <StaggerItem>
          <TiltCard className="p-8">
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="animate-float mb-6 flex size-28 items-center justify-center rounded-full bg-gradient-to-br from-violet via-blue to-cyan p-[2px]">
                <div className="flex size-full items-center justify-center rounded-full bg-ink-2 font-mono text-3xl font-bold text-fg">
                  AK
                </div>
              </div>
              <h3 className="text-xl font-semibold">{SITE.name}</h3>
              <p className="mt-1 text-sm text-muted">{SITE.role}</p>
              <div className="mt-6 grid w-full grid-cols-3 gap-2 border-t border-line pt-6 font-mono text-xs text-muted">
                <div>
                  <p className="text-lg font-semibold text-fg">AI/ML</p>
                  <p>focus</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-fg">Full</p>
                  <p>stack</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-fg">Open</p>
                  <p>source</p>
                </div>
              </div>
            </div>
          </TiltCard>
        </StaggerItem>

        {/* narrative + highlight grid */}
        <div>
          <StaggerItem>
            <p className="mb-8 max-w-2xl text-lg leading-relaxed text-muted">
              I&apos;m a Computer Science undergraduate who treats every idea as
              something to ship. My work sits at the intersection of{" "}
              <span className="text-fg">artificial intelligence</span> and{" "}
              <span className="text-fg">modern web engineering</span> — training
              intuition in ML fundamentals while building production-grade
              products with Next.js, TypeScript, and Supabase.
            </p>
          </StaggerItem>
          <div className="grid gap-4 sm:grid-cols-2">
            {highlights.map((h) => (
              <StaggerItem key={h.title}>
                <div className="glass h-full p-5 transition-colors hover:border-violet/50">
                  <h.icon className="mb-3 size-5 text-cyan" />
                  <h4 className="mb-1 font-medium">{h.title}</h4>
                  <p className="text-sm leading-relaxed text-muted">{h.body}</p>
                </div>
              </StaggerItem>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
