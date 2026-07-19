import type { Metadata } from "next";
import Link from "next/link";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import type { Post } from "@/lib/posts";
import { ArrowLeft, ArrowUpRight, CalendarDays } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog",
  description: "Articles on AI, machine learning, and full-stack engineering.",
};
export const revalidate = 300;

/** Public blog index — published articles only (enforced by RLS too). */
export default async function BlogPage() {
  let posts: Post[] = [];
  if (supabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("posts")
      .select("slug,title,excerpt,cover_image,published_at,id,blocks,seo_title,seo_description,published,created_at,updated_at")
      .eq("published", true)
      .order("published_at", { ascending: false });
    posts = (data ?? []) as Post[];
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <Link
        href="/"
        className="mb-10 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-4" /> Home
      </Link>

      <p className="eyebrow mb-3">Writing</p>
      <h1 className="mb-12 text-4xl font-semibold tracking-tight">Blog</h1>

      {posts.length === 0 ? (
        <p className="glass border-dashed p-10 text-center text-sm text-muted">
          Nothing published yet — first article coming soon.
        </p>
      ) : (
        <ul className="space-y-4">
          {posts.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/blog/${p.slug}`}
                className="g-border group block p-6 transition-transform hover:-translate-y-0.5"
              >
                <div className="mb-2 flex items-center gap-2 font-mono text-xs text-muted">
                  <CalendarDays className="size-3.5" />
                  {p.published_at &&
                    new Date(p.published_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                </div>
                <h2 className="mb-1 flex items-center gap-2 text-xl font-medium">
                  {p.title}
                  <ArrowUpRight className="size-4 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cyan" />
                </h2>
                {p.excerpt && (
                  <p className="line-clamp-2 text-sm leading-relaxed text-muted">
                    {p.excerpt}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
