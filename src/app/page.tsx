import { Shell } from "@/components/chrome/shell";
import { Hero } from "@/components/hero/hero";
import { About } from "@/components/sections/about";
import { Skills } from "@/components/sections/skills";
import { Projects } from "@/components/sections/projects";
import { Experience } from "@/components/sections/experience";
import { GitHubSection } from "@/components/sections/github";
import { LinkedInSection } from "@/components/sections/linkedin";
import { Contact } from "@/components/sections/contact";
import { Footer } from "@/components/sections/footer";
import { fetchGitHub } from "@/lib/github";

// Revalidate hourly so GitHub stats stay fresh.
export const revalidate = 3600;

export default async function Home() {
  const github = await fetchGitHub();

  return (
    <Shell>
      <Hero />
      <About />
      <Skills />
      <Projects />
      <Experience />
      <GitHubSection data={github} />
      <LinkedInSection />
      <Contact />
      <Footer />
    </Shell>
  );
}
