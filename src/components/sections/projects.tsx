"use client";

import { Section, StaggerItem } from "@/components/ui/section";
import { TiltCard } from "@/components/ui/tilt-card";
import { ExternalLink, Plus } from "lucide-react";
import { Github } from "@/components/ui/brand-icons";

export type Project = {
  title: string;
  description: string;
  url?: string;
  repo?: string;
  tags: string[];
  gradient: string;
  urlLabel?: string;
};

/** Default projects — can be superseded by rows from Supabase `projects`. */
export const defaultProjects: Project[] = [
  {
    title: "Darajni",
    description:
      "An Indian fashion brand focused on premium ethnic and contemporary wear with a seamless e-commerce experience.",
    url: "https://www.darajni.in",
    urlLabel: "Visit Website",
    tags: ["E-commerce", "Fashion", "Production"],
    gradient: "from-violet/30 via-blue/20 to-transparent",
  },
  {
    title: "New Talent Library",
    description:
      "A modern platform showcasing talent and digital innovation with responsive UI and scalable architecture.",
    url: "https://newtalentlibrary.vercel.app/",
    urlLabel: "Live Demo",
    repo: "https://github.com/7amankrishna",
    tags: ["Next.js", "Platform", "Responsive"],
    gradient: "from-cyan/30 via-blue/20 to-transparent",
  },
];

export function Projects({ projects = defaultProjects }: { projects?: Project[] }) {
  return (
    <Section id="projects" eyebrow="03 — Work" title="Things I've shipped.">
      <div className="grid gap-6 md:grid-cols-2">
        {projects.map((p) => (
          <StaggerItem key={p.title}>
            <TiltCard className="flex h-full flex-col p-7">
              {/* project banner */}
              <div
                className={`relative z-10 mb-6 flex h-40 items-end overflow-hidden rounded-xl bg-gradient-to-br ${p.gradient} border border-line p-5`}
              >
                <span className="font-mono text-2xl font-semibold tracking-tight">
                  {p.title}
                </span>
              </div>
              <p className="relative z-10 mb-5 flex-1 leading-relaxed text-muted">
                {p.description}
              </p>
              <div className="relative z-10 mb-6 flex flex-wrap gap-2">
                {p.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-line px-3 py-1 font-mono text-xs text-muted"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div className="relative z-10 flex gap-3">
                {p.url && (
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-fg px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-white"
                  >
                    <ExternalLink className="size-4" /> {p.urlLabel ?? "Live Demo"}
                  </a>
                )}
                {p.repo && (
                  <a
                    href={p.repo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors hover:border-violet/60"
                  >
                    <Github className="size-4" /> GitHub
                  </a>
                )}
              </div>
            </TiltCard>
          </StaggerItem>
        ))}

        {/* placeholder for what's next */}
        <StaggerItem className="md:col-span-2">
          <div className="glass flex items-center justify-center gap-3 border-dashed p-10 text-muted">
            <Plus className="size-5 text-violet" />
            <p className="font-mono text-sm">
              More projects in the lab — shipping soon.
            </p>
          </div>
        </StaggerItem>
      </div>
    </Section>
  );
}
