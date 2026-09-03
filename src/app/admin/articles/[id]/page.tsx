import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { ArticleForm } from "@/components/admin/article-form";
import { getFontLibrary } from "@/lib/fonts/query";
import type { Post } from "@/lib/posts";

export const metadata = { title: "Edit article" };
export const dynamic = "force-dynamic";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const [{ data: post }, library] = await Promise.all([
    supabase.from("posts").select("*").eq("id", id).maybeSingle(),
    getFontLibrary(),
  ]);

  if (!post) notFound();
  return <ArticleForm post={post as Post} library={library} />;
}
