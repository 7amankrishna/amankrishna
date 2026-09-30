"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { sanitizeArticleHtml } from "@/lib/content/sanitize";
import type { CmsActionState } from "@/lib/portfolio-types";

const text = (f: FormData, key: string) => String(f.get(key) ?? "").trim();
const tables: Record<string, string> = { projects: "projects", skills: "skills", journey: "journey_entries", journey_entries: "journey_entries", building: "building_entries", building_entries: "building_entries" };
const refresh = () => { revalidatePath("/", "layout"); revalidatePath("/admin", "layout"); revalidatePath("/projects/[slug]", "page"); };
const httpUrl = (value: string) => !value || /^https:\/\//i.test(value) || /^http:\/\//i.test(value);
const mediaUrl = (value: string) => !value || httpUrl(value) || /^\/(?!\/)/.test(value);
const linkUrl = (value: string) => !value || mediaUrl(value) || /^#/.test(value) || /^(mailto:|tel:)/.test(value);
const fieldMax: Record<string, number> = { title: 200, name: 120, slug: 120, category: 100, short_description: 500, description: 10000, seo_title: 200, seo_description: 500, image_alt: 200, subject: 200 };

async function save(table: string, f: FormData, keys: string[]): Promise<CmsActionState> {
  const { supabase } = await requireAdmin();
  const id = text(f, "id");
  const payload: Record<string, unknown> = {};
  for (const key of keys) if (f.has(key)) { payload[key] = text(f, key); if (fieldMax[key] && String(payload[key]).length > fieldMax[key]) return { ok: false, message: `${key} is too long.` }; }
  const titleKey = table === "skills" ? "name" : "title";
  if (!text(f, titleKey)) return { ok: false, message: "A title or name is required." };
  payload.sort_order = Math.trunc(Number(text(f, "sort_order")) || 0);
  const state = text(f, "state") || (f.get("published") === "on" || f.get("published") === "true" ? "published" : "draft");
  if (!["draft", "published", "archived"].includes(state)) return { ok: false, message: "Invalid publication state." };
  payload.state = state; payload.published = state === "published";
  if (table === "skills" || table === "projects") payload.featured = f.get("featured") === "on" || f.get("featured") === "true";
  for (const key of ["url", "repo"]) if (typeof payload[key] === "string" && !linkUrl(payload[key] as string)) return { ok: false, message: `Invalid ${key} URL.` };
  for (const key of ["media", "image"]) if (typeof payload[key] === "string" && !mediaUrl(payload[key] as string)) return { ok: false, message: `Invalid ${key} URL.` };
  if (table === "projects") {
    payload.slug = (text(f, "slug") || text(f, "title")).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    if (!payload.slug) return { ok: false, message: "A valid slug is required." };
    payload.media = text(f, "image") || text(f, "media");
    if (!mediaUrl(String(payload.media))) return { ok: false, message: "Invalid image URL." };
    payload.tags = text(f, "tags").split(",").map((v) => v.trim()).filter(Boolean);
    if (text(f, "tags").startsWith("[")) { try { const tags: unknown = JSON.parse(text(f, "tags")); if (!Array.isArray(tags) || !tags.every((t) => typeof t === "string")) throw new Error(); payload.tags = tags; } catch { return { ok: false, message: "Tags must be a string array or comma-separated text." }; } }
    for (const key of ["gallery", "content_json"]) if (f.has(key)) { try { payload[key] = JSON.parse(text(f, key) || (key === "gallery" ? "[]" : "null")); } catch { return { ok: false, message: `Invalid ${key} JSON.` }; } }
    if (payload.gallery && (!Array.isArray(payload.gallery) || !payload.gallery.every((v: unknown) => !!v && typeof v === "object" && "url" in v && typeof v.url === "string" && mediaUrl(v.url)))) return { ok: false, message: "Gallery requires an array of image URLs and alt text." };
    if (f.has("content_html")) payload.content_html = sanitizeArticleHtml(text(f, "content_html"));
    payload.repo = text(f, "repo") || null; payload.url = text(f, "url") || null;
  }
  const result = id ? await supabase.from(table).update(payload).eq("id", id).select("id").single() : await supabase.from(table).insert(payload).select("id").single();
  if (result.error) return { ok: false, message: result.error.message };
  refresh(); return { ok: true, message: id ? "Saved." : "Created.", id: String(result.data.id) };
}

export async function saveSettings(_prev: CmsActionState, f: FormData): Promise<CmsActionState> {
  const { supabase } = await requireAdmin(); let data: unknown;
  try { data = JSON.parse(text(f, "data") || text(f, "settings")); } catch { return { ok: false, message: "Settings must contain valid JSON." }; }
  if (!data || Array.isArray(data) || typeof data !== "object") return { ok: false, message: "Settings must be an object." };
  const settings = data as Record<string, unknown>;
  const fields: Record<string, string[]> = {
    profile: ["name", "headline", "bio", "avatar", "avatarAlt", "resume", "email", "phone", "location", "githubUser"],
    hero: ["eyebrow", "heading", "subtitle", "description", "primaryLabel", "primaryUrl", "secondaryLabel", "secondaryUrl", "image", "imageAlt", "status", "annotation"],
    about: ["heading", "body", "image", "imageAlt"],
    seo: ["title", "description", "canonicalUrl", "ogImage", "twitterImage", "robotsIndex", "robotsFollow"],
  };
  for (const [group, keys] of Object.entries(fields)) {
    const record = settings[group];
    if (!record || typeof record !== "object" || Array.isArray(record)) return { ok: false, message: `${group} must be an object.` };
    for (const key of keys) if (typeof (record as Record<string, unknown>)[key] !== "string") return { ok: false, message: `${group}.${key} must be text.` };
  }
  const arrays: Record<string, unknown> = { socials: settings.socials, sections: settings.sections, currentStatus: settings.currentStatus, facts: (settings.about as Record<string, unknown>).facts };
  for (const [key, value] of Object.entries(arrays)) if (!Array.isArray(value)) return { ok: false, message: `${key} must be an array.` };
  if (!(settings.currentStatus as unknown[]).every((v) => typeof v === "string") || typeof settings.philosophy !== "string") return { ok: false, message: "Philosophy and current status entries must be text." };
  const shape = (value: unknown, keys: string[]) => !!value && typeof value === "object" && keys.every((key) => typeof (value as Record<string, unknown>)[key] === "string");
  if (!(arrays.socials as unknown[]).every((v) => shape(v, ["label", "url"])) || !(arrays.facts as unknown[]).every((v) => shape(v, ["label", "value"]))) return { ok: false, message: "Invalid social link or fact." };
  const sectionIds = ["hero", "about", "philosophy", "skills", "projects", "journey", "github", "building", "status", "contact"];
  if (!(arrays.sections as Record<string, unknown>[]).every((v) => shape(v, ["id", "label", "heading"]) && sectionIds.includes(String(v.id)) && typeof v.visible === "boolean" && Number.isInteger(v.order))) return { ok: false, message: "Invalid homepage section." };
  const appearance = settings.appearance as Record<string, unknown> | null;
  if (!appearance || !["dark", "light", "system"].includes(String(appearance.theme)) || typeof appearance.accent !== "string" || !/^#[0-9a-f]{6}$/i.test(appearance.accent) || typeof appearance.motion !== "boolean" || typeof appearance.show3d !== "boolean") return { ok: false, message: "Invalid appearance settings." };
  const seo = settings.seo as Record<string, unknown>;
  if (!["index", "noindex"].includes(String(seo.robotsIndex)) || !["follow", "nofollow"].includes(String(seo.robotsFollow))) return { ok: false, message: "Invalid robots directives." };
  function validLinks(value: unknown): boolean {
    if (!value || typeof value !== "object") return true;
    return Object.entries(value).every(([key, v]) => { if (typeof v === "string" && key === "canonicalUrl") return httpUrl(v); if (typeof v === "string" && /^(url|avatar|resume|image|ogImage|twitterImage|primaryUrl|secondaryUrl)$/.test(key)) return linkUrl(v); return validLinks(v); });
  }
  if (!validLinks(settings)) return { ok: false, message: "Use HTTP(S), site-relative, mailto, tel, or anchor URLs." };
  const { error } = await supabase.from("portfolio_settings").upsert({ id: true, data, updated_at: new Date().toISOString() });
  if (error) return { ok: false, message: error.message }; refresh(); return { ok: true, message: "Settings saved." };
}
export async function saveProject(_prev: CmsActionState, f: FormData) { return save("projects", f, ["title", "slug", "category", "short_description", "description", "url", "repo", "tags", "media", "image_alt", "gallery", "year", "status", "content_html", "content_json", "why_built", "features", "architecture", "challenges", "learnings", "seo_title", "seo_description", "sort_order"]); }
export async function duplicateProject(f: FormData): Promise<CmsActionState> { const { supabase } = await requireAdmin(); const source = text(f, "id"); if (!source) return { ok: false, message: "Missing project id." }; const { data, error } = await supabase.from("projects").select("*").eq("id", source).maybeSingle(); if (error || !data) return { ok: false, message: "Project not found." }; const copy = { ...data, id: undefined, slug: `${String(data.slug || data.title).replace(/[^a-z0-9-]+/gi, "-")}-copy`, title: `${data.title} copy`, published: false, state: "draft", created_at: undefined, updated_at: undefined }; delete copy.id; delete copy.created_at; delete copy.updated_at; const result = await supabase.from("projects").insert(copy).select("id").single(); if (result.error) return { ok: false, message: result.error.message }; refresh(); return { ok: true, message: "Project duplicated as a draft.", id: String(result.data.id) }; }
export async function saveSkill(_prev: CmsActionState, f: FormData) { return save("skills", f, ["name", "category", "description", "icon", "sort_order"]); }
export async function saveJourney(_prev: CmsActionState, f: FormData) { return save("journey_entries", f, ["label", "title", "description", "period", "image", "image_alt", "sort_order"]); }
export async function saveBuilding(_prev: CmsActionState, f: FormData) { return save("building_entries", f, ["title", "description", "sort_order"]); }

export async function deleteCmsEntry(f: FormData): Promise<void> {
  const { supabase } = await requireAdmin(); const id = text(f, "id");
  const table = Object.hasOwn(tables, text(f, "table")) ? tables[text(f, "table")] : undefined;
  if (!table || !id) throw new Error("Invalid entry.");
  const { error } = await supabase.from(table).delete().eq("id", id); if (error) throw new Error(error.message); refresh();
}
export async function reorderCmsEntries(f: FormData): Promise<CmsActionState> {
  const { supabase } = await requireAdmin(); const table = Object.hasOwn(tables, text(f, "table")) ? tables[text(f, "table")] : undefined;
  if (!table) return { ok: false, message: "Invalid collection." };
  let entries: unknown; try { entries = JSON.parse(text(f, "entries")); } catch { return { ok: false, message: "Invalid order JSON." }; }
  if (!Array.isArray(entries) || !entries.every((v) => v && typeof v.id === "string" && Number.isInteger(v.sort_order))) return { ok: false, message: "Order requires entry IDs and integer positions." };
  for (const entry of entries) { const { error } = await supabase.from(table).update({ sort_order: entry.sort_order }).eq("id", entry.id); if (error) { refresh(); return { ok: false, message: error.message }; } }
  refresh(); return { ok: true, message: "Order saved." };
}
export async function uploadPortfolioMedia(f: FormData): Promise<CmsActionState> {
  const { supabase } = await requireAdmin(); const file = f.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > 10 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "application/pdf"].includes(file.type)) return { ok: false, message: "Choose an image or PDF up to 10 MB." };
  const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  const { error } = await supabase.storage.from("portfolio-media").upload(path, file, { upsert: false, contentType: file.type });
  if (error) return { ok: false, message: error.message };
  const { data } = supabase.storage.from("portfolio-media").getPublicUrl(path); refresh(); return { ok: true, message: data.publicUrl, id: path };
}
export async function deletePortfolioMedia(f: FormData): Promise<CmsActionState> {
  const { supabase } = await requireAdmin(); const path = text(f, "path");
  if (!path || path.includes("..") || path.startsWith("/")) return { ok: false, message: "Invalid media path." };
  const { error } = await supabase.storage.from("portfolio-media").remove([path]); if (error) return { ok: false, message: error.message }; refresh(); return { ok: true, message: "Media deleted." };
}
export async function markMessageRead(f: FormData): Promise<void> { await updateMessage(f, { read_at: text(f, "unread") === "true" ? null : new Date().toISOString() }); }
export async function archiveMessage(f: FormData): Promise<void> { await updateMessage(f, { archived_at: text(f, "restore") === "true" ? null : new Date().toISOString() }); }
async function updateMessage(f: FormData, values: Record<string, unknown>) { const { supabase } = await requireAdmin(); const id = text(f, "id"); if (!id) throw new Error("Missing message id."); const { error } = await supabase.from("contact_messages").update(values).eq("id", id); if (error) throw new Error(error.message); revalidatePath("/admin", "layout"); }
export async function deleteMessage(f: FormData): Promise<void> { const { supabase } = await requireAdmin(); const id = text(f, "id"); if (!id) throw new Error("Missing message id."); const { error } = await supabase.from("contact_messages").delete().eq("id", id); if (error) throw new Error(error.message); revalidatePath("/admin", "layout"); }
