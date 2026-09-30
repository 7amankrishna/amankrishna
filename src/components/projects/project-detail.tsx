import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { ArticleBody } from "@/components/blog/article-body";
import type { PortfolioProject } from "@/lib/portfolio-types";

const narratives = [
  ["why_built", "Why it was built"],
  ["features", "Features"],
  ["architecture", "Architecture"],
  ["challenges", "Challenges"],
  ["learnings", "Learnings"],
] as const;

export function ProjectDetail({ project, preview = false }: { project: PortfolioProject; preview?: boolean }) {
  const description = project.short_description || project.description;
  const body = project.content_html.trim();
  return (
    <main className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
      {!preview && <Link href="/#projects" className="mb-12 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-fg"><ArrowLeft className="size-4" /> Projects</Link>}
      <article>
        <header className="mb-12 max-w-3xl">
          {project.category && <p className="eyebrow mb-3">{project.category}</p>}
          <h1 className="font-serif text-4xl leading-tight tracking-tight sm:text-6xl">{project.title}</h1>
          {description && <p className="mt-5 text-lg leading-relaxed text-muted">{description}</p>}
          <div className="mt-5 flex flex-wrap gap-4 text-xs text-muted">{project.year && <span>{project.year}</span>}{project.status && <span>{project.status}</span>}</div>
          {project.tags.length > 0 && <ul className="mt-6 flex flex-wrap gap-2">{project.tags.map((tag) => <li key={tag} className="rounded-full border border-line px-3 py-1 text-xs text-muted">{tag}</li>)}</ul>}
        </header>
        {project.image && <img src={project.image} alt={project.image_alt} className="mb-12 w-full border border-line" />}
        {project.gallery.length > 0 && <div className="mb-12 grid gap-4 sm:grid-cols-2">{project.gallery.map((item, index) => <img key={`${item.url}-${index}`} src={item.url} alt={item.alt} className="w-full border border-line" />)}</div>}
        {body && <ArticleBody post={{ content_html: body, blocks: null }} />}
        <div className={body ? "mt-14 grid gap-4 sm:grid-cols-2" : "grid gap-4 sm:grid-cols-2"}>
          {narratives.map(([key, label]) => project[key] ? <section key={key} className="glass p-6"><h2 className="eyebrow mb-3">{label}</h2><p className="leading-relaxed text-muted">{project[key]}</p></section> : null)}
        </div>
        {(project.url || project.repo) && <div className="mt-12 flex flex-wrap gap-3">{project.url && <a href={project.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-cyan px-5 py-2 text-sm hover:bg-cyan/10">Visit project <ArrowUpRight className="size-4" /></a>}{project.repo && <a href={project.repo} target="_blank" rel="noopener noreferrer" className="rounded-full border border-line px-5 py-2 text-sm text-muted hover:border-violet hover:text-fg">Source code</a>}</div>}
      </article>
    </main>
  );
}
