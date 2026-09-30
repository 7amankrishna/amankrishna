"use client";

import { Section, StaggerItem } from "@/components/ui/section";
import {
  Braces,
  MonitorSmartphone,
  Server,
  Database,
  Wrench,
  Sparkles,
} from "lucide-react";

const groups = [
  { icon: Braces, title: "Languages", items: ["C", "C++", "Python", "JavaScript", "TypeScript"] },
  { icon: MonitorSmartphone, title: "Frontend", items: ["React", "Next.js", "HTML", "CSS", "Tailwind"] },
  { icon: Server, title: "Backend", items: ["Node.js", "Express", "Supabase"] },
  { icon: Database, title: "Database", items: ["PostgreSQL", "Supabase"] },
  { icon: Wrench, title: "Tools", items: ["Git", "GitHub", "VS Code", "Linux", "Vercel"] },
  { icon: Sparkles, title: "AI", items: ["OpenAI APIs", "Prompt Engineering", "Machine Learning Basics"] },
];

export function Skills() {
  return (
    <Section id="skills" eyebrow="02 — Skills" title="Tools of the trade.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <StaggerItem key={g.title}>
            <div className="g-border group h-full p-6 transition-transform duration-300 hover:-translate-y-1">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-violet/10 text-violet transition-colors group-hover:bg-violet/20">
                  <g.icon className="size-4" />
                </span>
                <h3 className="font-medium">{g.title}</h3>
              </div>
              <ul className="flex flex-wrap gap-2">
                {g.items.map((s) => (
                  <li
                    key={s}
                    className="rounded-full border border-line bg-surface px-3 py-1 font-mono text-xs text-muted transition-colors hover:border-cyan/50 hover:text-fg"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </StaggerItem>
        ))}
      </div>
    </Section>
  );
}
