"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";

export type AdminActionState = { ok: boolean; message: string } | null;

/** Create or update a project (pass `id` to update). */
export async function saveProject(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim() || null;
  const repo = String(formData.get("repo") ?? "").trim() || null;
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const published = formData.get("published") === "on";
  const sortOrder = Number(formData.get("sort_order") ?? 0) || 0;

  if (!title) return { ok: false, message: "Title is required." };
  if (!description) return { ok: false, message: "Description is required." };

  const payload = { title, description, url, repo, tags, published, sort_order: sortOrder };
  const query = id
    ? supabase.from("projects").update(payload).eq("id", id)
    : supabase.from("projects").insert(payload);

  const { error } = await query;
  if (error) {
    console.error("saveProject failed:", error.message);
    return { ok: false, message: "Save failed — try again." };
  }

  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true, message: id ? "Project updated." : "Project added." };
}

/** Delete a project. */
export async function deleteProject(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) console.error("deleteProject failed:", error.message);
    revalidatePath("/admin");
    revalidatePath("/");
  }
}

/** Delete a contact message. */
export async function deleteMessage(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) {
    const { error } = await supabase.from("contact_messages").delete().eq("id", id);
    if (error) console.error("deleteMessage failed:", error.message);
    revalidatePath("/admin");
  }
}
