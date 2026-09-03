import type { Metadata } from "next";
import { Shell } from "@/components/chrome/shell";
import { Hero } from "@/components/hero/hero";
import { About } from "@/components/sections/about";
import { Skills } from "@/components/sections/skills";
import { Projects, defaultProjects, type Project } from "@/components/sections/projects";
import { Experience } from "@/components/sections/experience";
import { GitHubSection } from "@/components/sections/github";
import { LinkedInSection } from "@/components/sections/linkedin";
import { Contact } from "@/components/sections/contact";
import { Footer } from "@/components/sections/footer";
import { fetchGitHub } from "@/lib/github";
import { SITE } from "@/lib/site";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

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

// Alternate banner gradients cycled across Supabase-managed projects.
const gradients = [
  "from-violet/30 via-blue/20 to-transparent",
  "from-cyan/30 via-blue/20 to-transparent",
  "from-blue/30 via-violet/20 to-transparent",
];

/** Published projects from Supabase; falls back to the built-in list. */
async function fetchProjects(): Promise<Project[]> {
  if (!supabaseConfigured()) return defaultProjects;
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("title,description,url,repo,tags")
    .eq("published", true)
    .order("sort_order", { ascending: true });
  if (!data || data.length === 0) return defaultProjects;

  return data.map((p, i) => ({
    title: p.title,
    description: p.description,
    url: p.url ?? undefined,
    repo: p.repo ?? undefined,
    tags: p.tags ?? [],
    gradient: gradients[i % gradients.length],
    urlLabel: "Visit Website",
  }));
}

export default async function Home() {
  const [github, projects] = await Promise.all([fetchGitHub(), fetchProjects()]);

  return (
    <Shell>
      <Hero />
      <About />
      <Skills />
      <Projects projects={projects} />
      <Experience />
      <GitHubSection data={github} />
      <LinkedInSection />
      <Contact />
      <Footer />
    </Shell>
  );
}
