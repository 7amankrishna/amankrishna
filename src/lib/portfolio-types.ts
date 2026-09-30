/** Shared CMS contract. Public content is loaded from Supabase, never JSX fixtures. */
export type PublicationState = "draft" | "published" | "archived";
export type SectionKey = "hero" | "about" | "philosophy" | "skills" | "projects" | "journey" | "github" | "building" | "status" | "contact";
export type HomepageSection = { id: SectionKey; label: string; heading: string; visible: boolean; order: number };
export type PortfolioSettings = {
  profile: { name: string; headline: string; bio: string; avatar: string; avatarAlt: string; resume: string; email: string; phone: string; location: string; githubUser: string };
  hero: { eyebrow: string; heading: string; subtitle: string; description: string; primaryLabel: string; primaryUrl: string; secondaryLabel: string; secondaryUrl: string; image: string; imageAlt: string; status: string; annotation: string };
  about: { heading: string; body: string; image: string; imageAlt: string; facts: { label: string; value: string }[] };
  philosophy: string;
  currentStatus: string[];
  socials: { label: string; url: string }[];
  sections: HomepageSection[];
  appearance: { theme: "light" | "dark" | "system"; accent: string; motion: boolean; show3d: boolean };
  seo: { title: string; description: string; canonicalUrl: string; ogImage: string; twitterImage: string; robotsIndex: "index" | "noindex"; robotsFollow: "follow" | "nofollow" };
};
export type Skill = { id: string; name: string; category: string; description: string; icon: string; sort_order: number; featured: boolean; published: boolean; state: PublicationState };
export type JourneyEntry = { id: string; label: string; title: string; description: string; period: string; image: string; image_alt: string; sort_order: number; published: boolean; state: PublicationState };
export type BuildingEntry = { id: string; title: string; description: string; sort_order: number; published: boolean; state: PublicationState };
export type PortfolioProject = {
  id: string; title: string; slug: string; category: string; short_description: string; description: string;
  tags: string[]; image: string; image_alt: string; gallery: { url: string; alt: string }[];
  repo: string | null; url: string | null; year: string; status: string; featured: boolean;
  sort_order: number; published: boolean; state: PublicationState; content_html: string; content_json: unknown;
  why_built: string; features: string; architecture: string; challenges: string; learnings: string;
  seo_title: string; seo_description: string; created_at: string; updated_at: string;
};
export type PortfolioData = { settings: PortfolioSettings; skills: Skill[]; projects: PortfolioProject[]; journey: JourneyEntry[]; building: BuildingEntry[]; configured: boolean; error?: string };
export type CmsActionState = { ok: boolean; message: string; id?: string } | null;
