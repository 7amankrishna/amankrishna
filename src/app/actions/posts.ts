"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { slugify, type Block } from "@/lib/posts";

export type PostActionState = { ok: boolean; message: string } | null;

/** Shared validation + payload extraction for save/publish. */
function parsePostForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const rawSlug = String(formData.get("slug") ?? "").trim();
  const slug = slugify(rawSlug || title);
  const excerpt = String(formData.get("excerpt") ?? "").trim() || null;
  const seoTitle = String(formData.get("seo_title") ?? "").trim() || null;
  const seoDescription =
    String(formData.get("seo_description") ?? "").trim() || null;
  const coverImage = String(formData.get("cover_image") ?? "").trim() || null;
  const published = formData.get("published") === "on";

  let blocks: Block[] = [];
  try {
    blocks = JSON.parse(String(formData.get("blocks") ?? "[]"));
  } catch {
    /* keep [] */
  }

  return {
    title,
    slug,
    excerpt,
    blocks,
    seo_title: seoTitle,
    seo_description: seoDescription,
    cover_image: coverImage,
    published,
  };
}

/** Create or update an article. Pass an `id` field to update. */
export async function savePost(
  _prev: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const data = parsePostForm(formData);

  if (!data.title) return { ok: false, message: "Title is required." };
  if (!data.slug) return { ok: false, message: "Slug is required." };

  const payload = {
    ...data,
    published_at: data.published ? new Date().toISOString() : null,
  };

  const query = id
    ? supabase.from("posts").update(payload).eq("id", id)
    : supabase.from("posts").insert(payload);

  const { error } = await query;

  if (error) {
    if (error.code === "23505")
      return { ok: false, message: `Slug "${data.slug}" is already taken.` };
    console.error("savePost failed:", error.message);
    return { ok: false, message: "Save failed — check the fields and retry." };
  }

  revalidatePath("/blog");
  revalidatePath(`/blog/${data.slug}`);
  revalidatePath("/admin/articles");
  return {
    ok: true,
    message: data.published ? `Published at /blog/${data.slug}` : "Draft saved.",
  };
}

/** Delete an article and return to the article list. */
export async function deletePost(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) {
    await supabase.from("posts").delete().eq("id", id);
    revalidatePath("/blog");
    revalidatePath("/admin/articles");
  }
  redirect("/admin/articles");
}
