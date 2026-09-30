import { cache } from "react";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import type { PortfolioData, PortfolioProject, PortfolioSettings } from "@/lib/portfolio-types";

// Deliberately content-free fallback: setup can render technical sections without inventing identity.
const blankSettings: PortfolioSettings = {
  profile: { name: "", headline: "", bio: "", avatar: "", avatarAlt: "", resume: "", email: "", phone: "", location: "", githubUser: "" },
  hero: { eyebrow: "", heading: "", subtitle: "", description: "", primaryLabel: "", primaryUrl: "", secondaryLabel: "", secondaryUrl: "", image: "", imageAlt: "", status: "", annotation: "" },
  about: { heading: "", body: "", image: "", imageAlt: "", facts: [] }, philosophy: "", currentStatus: [], socials: [], sections: [],
  appearance: { theme: "system", accent: "#7c5cff", motion: true, show3d: false }, seo: { title: "", description: "", canonicalUrl: "", ogImage: "", twitterImage: "", robotsIndex: "index", robotsFollow: "follow" },
};

function asProject(row: Record<string, unknown>): PortfolioProject {
  const slug = String(row.slug ?? "").trim() || String(row.title ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return { id: String(row.id), title: String(row.title ?? ""), slug, category: String(row.category ?? ""), short_description: String(row.short_description ?? row.description ?? ""), description: String(row.description ?? ""), tags: Array.isArray(row.tags) ? row.tags.filter((v): v is string => typeof v === "string") : [], image: String(row.media ?? row.image ?? ""), image_alt: String(row.image_alt ?? ""), gallery: Array.isArray(row.gallery) ? row.gallery as PortfolioProject["gallery"] : [], repo: row.repo ? String(row.repo) : null, url: row.url ? String(row.url) : null, year: String(row.year ?? ""), status: String(row.status ?? ""), featured: Boolean(row.featured), sort_order: Number(row.sort_order ?? 0), published: Boolean(row.published), state: row.state === "archived" || row.state === "draft" ? row.state : "published", content_html: String(row.content_html ?? ""), content_json: row.content_json ?? null, why_built: String(row.why_built ?? ""), features: String(row.features ?? ""), architecture: String(row.architecture ?? ""), challenges: String(row.challenges ?? ""), learnings: String(row.learnings ?? ""), seo_title: String(row.seo_title ?? ""), seo_description: String(row.seo_description ?? ""), created_at: String(row.created_at ?? ""), updated_at: String(row.updated_at ?? "") };
}

function mergeSettings(value: unknown): PortfolioSettings {
  const root = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const object = (key: string) => root[key] && typeof root[key] === "object" && !Array.isArray(root[key]) ? root[key] as Record<string, unknown> : {};
  const profile = object("profile"), hero = object("hero"), about = object("about"), appearance = object("appearance"), seo = object("seo");
  const mergeGroup = <T extends object>(source: Record<string, unknown>, fallback: T): T => Object.fromEntries(Object.entries(fallback).map(([key, defaultValue]) => [key, source[key] !== undefined ? source[key] : defaultValue])) as T;
  const theme = appearance.theme === "light" || appearance.theme === "dark" || appearance.theme === "system" ? appearance.theme : blankSettings.appearance.theme;
  return { profile: mergeGroup(profile, blankSettings.profile), hero: mergeGroup(hero, blankSettings.hero), about: { ...blankSettings.about, ...mergeGroup(about, blankSettings.about), facts: Array.isArray(about.facts) ? about.facts.filter((v): v is { label: string; value: string } => !!v && typeof v === "object" && typeof (v as Record<string, unknown>).label === "string" && typeof (v as Record<string, unknown>).value === "string") : [] }, philosophy: typeof root.philosophy === "string" ? root.philosophy : "", currentStatus: Array.isArray(root.currentStatus) ? root.currentStatus.filter((v): v is string => typeof v === "string") : [], socials: Array.isArray(root.socials) ? root.socials.filter((v): v is { label: string; url: string } => !!v && typeof v === "object" && typeof (v as Record<string, unknown>).label === "string" && typeof (v as Record<string, unknown>).url === "string") : [], sections: Array.isArray(root.sections) ? root.sections.filter((v): v is PortfolioSettings["sections"][number] => !!v && typeof v === "object" && typeof (v as Record<string, unknown>).id === "string" && typeof (v as Record<string, unknown>).label === "string" && typeof (v as Record<string, unknown>).heading === "string" && typeof (v as Record<string, unknown>).visible === "boolean" && Number.isInteger((v as Record<string, unknown>).order)) : [], appearance: { ...mergeGroup(appearance, blankSettings.appearance), theme }, seo: mergeGroup(seo, blankSettings.seo) };
}

export const getPortfolioData = cache(async (admin = false): Promise<PortfolioData> => {
  if (!supabaseConfigured()) return { settings: blankSettings, skills: [], projects: [], journey: [], building: [], configured: false, error: "Portfolio CMS is not configured." };
  const supabase = admin ? (await requireAdmin()).supabase : await createClient();
  const rows = (table: string) => { const q = supabase.from(table).select("*").order("sort_order"); return admin ? q : q.eq("published", true).eq("state", "published"); };
  const [s, skills, projects, journey, building] = await Promise.all([supabase.from("portfolio_settings").select("data").eq("id", true).maybeSingle(), rows("skills"), rows("projects"), rows("journey_entries"), rows("building_entries")]);
  const error = s.error ?? skills.error ?? projects.error ?? journey.error ?? building.error;
  return { settings: mergeSettings(s.data?.data), skills: (skills.data ?? []) as PortfolioData["skills"], projects: (projects.data ?? []).map((r) => asProject(r as Record<string, unknown>)), journey: (journey.data ?? []) as PortfolioData["journey"], building: (building.data ?? []) as PortfolioData["building"], configured: true, ...(error ? { error: error.message } : {}) };
});
export const getPortfolio = getPortfolioData;

export async function getProjectBySlug(slug: string) { if (!supabaseConfigured()) return null; const { data, error } = await (await createClient()).from("projects").select("*").eq("slug", slug).eq("published", true).eq("state", "published").maybeSingle(); return error || !data ? null : asProject(data as Record<string, unknown>); }
export async function getProjectPreview(id: string) { const { supabase } = await requireAdmin(); const { data, error } = await supabase.from("projects").select("*").eq("id", id).maybeSingle(); return error || !data ? null : asProject(data as Record<string, unknown>); }
export async function getProjectSlugRedirect(slug: string) { if (!supabaseConfigured()) return null; const supabase = await createClient(); const { data } = await supabase.from("project_slug_history").select("project_id").eq("slug", slug).maybeSingle(); if (!data) return null; const { data: target } = await supabase.from("projects").select("slug").eq("id", data.project_id).eq("published", true).eq("state", "published").maybeSingle(); return target?.slug && target.slug !== slug ? String(target.slug) : null; }
