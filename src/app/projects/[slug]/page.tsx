import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

import { StructuredData } from "@/components/seo/structured-data";
import { ArticleBody } from "@/components/blog/article-body";
import { getProjectBySlug } from "@/lib/portfolio";
import { breadcrumbJsonLd, graph, personJsonLd, websiteJsonLd, type BreadcrumbStep } from "@/lib/seo/jsonld";
import { projectMetadata } from "@/lib/seo/metadata";
import { SITE } from "@/lib/site";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

export const revalidate = 300;
type Params = Promise<{ slug: string }>;
const getProject = cache(getProjectBySlug);

async function redirectTarget(slug: string): Promise<string | null> {
  if (!supabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_slug_history")
    .select("project_id")
    .eq("slug", slug)
    .maybeSingle();
  const projectId = (data as { project_id?: string } | null)?.project_id;
  if (!projectId) return null;
  const { data: target } = await supabase
    .from("projects")
    .select("slug")
    .eq("id", projectId)
    .eq("published", true)
    .eq("state", "published")
    .maybeSingle();
  const nextSlug = (target as { slug?: string } | null)?.slug;
  return nextSlug && nextSlug !== slug ? nextSlug : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return { title: "Project not found", robots: { index: false, follow: true } };
  return projectMetadata(project);
}

export default async function ProjectPage({ params }: { params: Params }) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) {
    const moved = await redirectTarget(slug);
    if (moved) permanentRedirect(`/projects/${moved}`);
    notFound();
  }

  const title = project.title;
  const description = project.short_description || project.description;
  const trail: BreadcrumbStep[] = [
    { name: "Home", url: SITE.url },
    { name: "Projects", url: `${SITE.url}/#projects` },
    { name: title, url: `${SITE.url}/projects/${slug}` },
  ];
  const tags = project.tags;
  const body = project.content_html;

  return (
    <>
      <StructuredData id="project-jsonld" data={graph(websiteJsonLd(), personJsonLd(), breadcrumbJsonLd(trail))} />
      <main className="mx-auto max-w-4xl px-6 py-20 sm:py-28">
        <Link href="/#projects" className="mb-12 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-fg">
          <ArrowLeft className="size-4" /> Projects
        </Link>
        <article>
          <header className="mb-12 max-w-3xl">
            <p className="eyebrow mb-3">{String(project.category ?? "Project")}</p>
            <h1 className="font-serif text-4xl leading-tight tracking-tight sm:text-6xl">{title}</h1>
            {description && <p className="mt-5 text-lg leading-relaxed text-muted">{description}</p>}
            {tags.length > 0 && <ul className="mt-6 flex flex-wrap gap-2">{tags.map((tag) => <li key={tag} className="rounded-full border border-line px-3 py-1 text-xs text-muted">{tag}</li>)}</ul>}
          </header>
          {typeof project.image === "string" && project.image && (
            // eslint-disable-next-line @next/next/no-img-element -- CMS-managed remote URLs
            <img src={project.image} alt={String(project.image_alt ?? "")} className="mb-12 w-full border border-line" />
          )}
          {body ? <ArticleBody post={{ content_html: body, blocks: null }} /> : <div className="grid gap-4 sm:grid-cols-2">
            {(["why_built", "features", "architecture", "challenges", "learnings"] as const).map((key) => typeof project[key] === "string" && project[key] ? <section key={key} className="glass p-6"><h2 className="eyebrow mb-3">{key.replace("_", " ")}</h2><p className="leading-relaxed text-muted">{project[key] as string}</p></section> : null)}
          </div>}
          <div className="mt-12 flex flex-wrap gap-3">
            {typeof project.url === "string" && project.url && <a href={project.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-cyan px-5 py-2 text-sm hover:bg-cyan/10">Visit project <ArrowUpRight className="size-4" /></a>}
            {typeof project.repo === "string" && project.repo && <a href={project.repo} target="_blank" rel="noopener noreferrer" className="rounded-full border border-line px-5 py-2 text-sm text-muted hover:border-violet hover:text-fg">Source code</a>}
          </div>
        </article>
      </main>
    </>
  );
}
