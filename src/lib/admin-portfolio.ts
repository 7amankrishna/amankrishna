import { requireAdmin } from "@/lib/admin";
import { getPortfolioData } from "@/lib/portfolio";
import type { PortfolioData } from "@/lib/portfolio-types";

export async function getAdminPortfolio(): Promise<{ email: string; data: PortfolioData }> {
  const { supabase, user } = await requireAdmin();
  const [base, skills, projects, journey, building] = await Promise.all([
    getPortfolioData(),
    supabase.from("skills").select("*").order("sort_order"),
    supabase.from("projects").select("*").order("sort_order"),
    supabase.from("journey_entries").select("*").order("sort_order"),
    supabase.from("building_entries").select("*").order("sort_order"),
  ]);
  const error = skills.error ?? projects.error ?? journey.error ?? building.error;
  return { email: user.email ?? "", data: { ...base, skills: skills.data ?? [], projects: (projects.data ?? []).map(row => ({ ...row, image: row.media ?? row.image ?? "" })), journey: journey.data ?? [], building: building.data ?? [], ...(error ? { error: error.message } : {}) } };
}
