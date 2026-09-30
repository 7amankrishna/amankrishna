import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { ArticleBody } from "@/components/blog/article-body";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function ProjectPreview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { supabase } = await requireAdmin();
  const { data: project } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  if (!project) notFound();
  return <main className="mx-auto max-w-4xl px-6 py-16"><div className="mb-8 flex items-center justify-between"><span className="rounded-full bg-violet/15 px-3 py-1 text-xs text-violet">Admin preview · {project.state}</span><Link href={`/admin/projects`} className="text-sm text-muted hover:text-fg">Back to projects</Link></div><article><p className="eyebrow">{project.category || "Project"}</p><h1 className="mt-3 text-4xl font-semibold">{project.title}</h1><p className="mt-4 text-lg text-muted">{project.short_description || project.description}</p>{project.media && <img src={project.media} alt={project.image_alt || ""} className="my-10 w-full" />}{project.content_html ? <ArticleBody post={{ content_html: project.content_html, blocks: null }} /> : <div className="mt-10 grid gap-4 sm:grid-cols-2">{["why_built", "features", "architecture", "challenges", "learnings"].map(key => project[key] && <section key={key} className="glass p-5"><h2 className="eyebrow mb-2">{key.replace("_", " ")}</h2><p className="whitespace-pre-wrap text-muted">{project[key]}</p></section>)}</div>}</article></main>;
}
