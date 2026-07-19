import Link from "next/link";
import { requireAdmin, supabaseConfigured } from "@/lib/admin";
import type { Post } from "@/lib/posts";
import { ArrowLeft, FilePlus2, FileText, Globe, FileClock } from "lucide-react";

export const metadata = { title: "Articles" };
export const dynamic = "force-dynamic";

/** Admin article list — create, edit, see status at a glance. */
export default async function ArticlesPage() {
  if (!supabaseConfigured()) {
    return (
      <main className="flex min-h-svh items-center justify-center px-6">
        <p className="glass max-w-md p-8 text-center text-sm text-muted">
          Configure Supabase in .env.local to manage articles.
        </p>
      </main>
    );
  }

  const { supabase } = await requireAdmin();
  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .order("updated_at", { ascending: false });

  const list = (posts ?? []) as Post[];

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/admin"
        className="mb-8 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-4" /> Dashboard
      </Link>

      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Articles</h1>
        <Link
          href="/admin/articles/new"
          className="inline-flex items-center gap-2 rounded-xl bg-fg px-5 py-2.5 text-sm font-medium text-ink transition-all hover:opacity-90"
        >
          <FilePlus2 className="size-4" /> New article
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="glass border-dashed p-10 text-center">
          <FileText className="mx-auto mb-3 size-8 text-muted" />
          <p className="text-sm text-muted">
            No articles yet. Write your first one — it publishes to /blog.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/articles/${p.id}`}
                className="glass flex items-center gap-4 p-5 transition-all hover:-translate-y-0.5 hover:border-violet/50"
              >
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                    p.published ? "bg-cyan/10 text-cyan" : "bg-line text-muted"
                  }`}
                >
                  {p.published ? <Globe className="size-4" /> : <FileClock className="size-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{p.title}</span>
                  <span className="block truncate font-mono text-xs text-muted">
                    /blog/{p.slug} · {p.published ? "published" : "draft"} ·{" "}
                    {new Date(p.updated_at).toLocaleDateString()}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
