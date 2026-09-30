import type { Metadata } from "next";
import { Shell } from "@/components/chrome/shell";
import { Hero } from "@/components/hero/hero";
import { About } from "@/components/sections/about";
import { Skills } from "@/components/sections/skills";
import { Projects } from "@/components/sections/projects";
import { Experience } from "@/components/sections/experience";
import { GitHubSection } from "@/components/sections/github";
import { Contact } from "@/components/sections/contact";
import { Footer } from "@/components/sections/footer";
import { fetchGitHub } from "@/lib/github";
import { SITE } from "@/lib/site";
import { getPortfolioData as getPortfolio } from "@/lib/portfolio";
import type { SectionKey } from "@/lib/portfolio-types";
import type { ReactNode } from "react";

/**
 * Title, description and Open Graph are inherited from the root layout — only
 * the self-referencing canonical is declared here.
 *
 * It has to live on the page rather than in the layout: a `canonical` in a
 * layout is inherited by every page that does not set its own, which would have
 * `/blog` claiming to be `/`. Setting `alternates` also replaces the layout's
 * copy, so the feed link is repeated.
 */
export const metadata: Metadata = {
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": [
        { url: "/feed.xml", title: `${SITE.blog.title} — ${SITE.name}` },
      ],
    },
  },
};

// Revalidate hourly so GitHub stats stay fresh.
export const revalidate = 3600;

export default async function Home() {
  const [github, portfolio] = await Promise.all([fetchGitHub(), getPortfolio()]);
  const selectedProjects = portfolio.projects.filter((project) => project.featured);
  const content: Record<SectionKey, ReactNode> = {
    hero: <Hero data={portfolio.settings} />,
    about: <About data={portfolio.settings} />,
    philosophy: portfolio.settings.philosophy ? <section id="philosophy" className="mx-auto max-w-6xl px-6 pb-20"><p className="eyebrow mb-5">Working philosophy</p><p className="editorial-lede max-w-3xl">{portfolio.settings.philosophy}</p></section> : null,
    skills: <Skills skills={portfolio.skills} />,
    projects: <Projects projects={selectedProjects.length ? selectedProjects : portfolio.projects} />,
    journey: <Experience entries={portfolio.journey} />,
    building: <LabNotes building={portfolio.building} status={[]} mode="building" />,
    status: <LabNotes building={[]} status={portfolio.settings.currentStatus} mode="status" />,
    github: <GitHubSection data={github} />,
    contact: <Contact settings={portfolio.settings} />,
  };
  const sections = portfolio.settings.sections.length ? [...portfolio.settings.sections].sort((a, b) => a.order - b.order).filter((s) => s.visible).map((s) => s.id) : Object.keys(content) as SectionKey[];

  return (
    <Shell settings={portfolio.settings}>
      {sections.map((id) => <div key={id}>{content[id]}</div>)}
      <Footer settings={portfolio.settings} />
    </Shell>
  );
}

function LabNotes({ building, status, mode }: { building: { id: string; title: string; description: string }[]; status: string[]; mode: "building" | "status" }) {
  return <section id={mode} className="mx-auto max-w-6xl px-6 pb-20">{mode === "building" ? <div className="editorial-note"><p className="eyebrow">05 / Building</p><h2>Currently in the lab.</h2>{building.length ? building.map((item) => <p key={item.id} className="mt-4 text-muted"><strong className="text-fg">{item.title}</strong><br />{item.description}</p>) : <p className="mt-4 text-muted">New notes will appear here as they are published.</p>}</div> : <div className="editorial-note"><p className="eyebrow">06 / Status</p><h2>Where things stand.</h2>{status.length ? status.map((item) => <p key={item} className="mt-4 text-muted">{item}</p>) : <p className="mt-4 text-muted">Status updates will appear here as they are published.</p>}</div>}</section>;
}
