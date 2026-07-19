"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Section } from "@/components/ui/section";
import { GraduationCap, Brain, Hammer, GitPullRequest, Lightbulb } from "lucide-react";

const steps = [
  {
    icon: GraduationCap,
    title: "B.Tech Journey",
    period: "Ongoing",
    body: "Pursuing Computer Science Engineering — data structures, algorithms, OS, DBMS, and the fundamentals that make everything else possible.",
  },
  {
    icon: Brain,
    title: "AI Learning",
    period: "Continuous",
    body: "Studying machine learning foundations, working with OpenAI APIs, and practicing prompt engineering on real problems.",
  },
  {
    icon: Hammer,
    title: "Personal Projects",
    period: "Always shipping",
    body: "Built and deployed production sites like Darajni and New Talent Library — owning everything from design to deployment.",
  },
  {
    icon: GitPullRequest,
    title: "Open Source Contributions",
    period: "Growing",
    body: "Contributing to open source to learn from real codebases and give back to the tools I use daily.",
  },
  {
    icon: Lightbulb,
    title: "Startup Exploration",
    period: "Exploring",
    body: "Studying how products are built and scaled — with the goal of turning ideas into ventures.",
  },
];

export function Experience() {
  const reduce = useReducedMotion();

  return (
    <Section id="experience" eyebrow="04 — Journey" title="The path so far.">
      <div className="relative ml-3 border-l border-line pl-8 sm:ml-6 sm:pl-12">
        {/* animated gradient line overlay */}
        <motion.div
          aria-hidden
          className="absolute -left-px top-0 w-px bg-gradient-to-b from-violet via-blue to-cyan"
          initial={reduce ? { height: "100%" } : { height: 0 }}
          whileInView={{ height: "100%" }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
        {steps.map((s, i) => (
          <motion.div
            key={s.title}
            className="relative pb-12 last:pb-0"
            initial={reduce ? false : { opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
          >
            {/* node */}
            <span className="absolute -left-[45px] top-0 flex size-9 items-center justify-center rounded-full border border-line bg-ink-2 sm:-left-[61px]">
              <s.icon className="size-4 text-cyan" />
            </span>
            <p className="eyebrow mb-1 !text-violet">{s.period}</p>
            <h3 className="mb-2 text-lg font-medium">{s.title}</h3>
            <p className="max-w-xl leading-relaxed text-muted">{s.body}</p>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
