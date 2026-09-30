import { requireAdmin, supabaseConfigured } from "@/lib/admin";
import { AdminFrame } from "@/components/admin/cms-panels";
import Link from "next/link";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

/**
 * Admin dashboard — server-guarded by Supabase Auth AND an email check;
 * only the site owner's account gets in. RLS enforces the same rule
 * at the database layer.
 */
export default async function AdminPage() {
  if (!supabaseConfigured()) {
    return (
      <main className="flex min-h-svh items-center justify-center px-6">
        <div className="glass max-w-md p-8 text-center">
          <h1 className="mb-2 font-medium">Supabase not configured</h1>
          <p className="text-sm text-muted">
            Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to
            .env.local, then run the SQL in supabase/schema.sql.
          </p>
        </div>
      </main>
    );
  }

  const { supabase, user } = await requireAdmin();

  const [{ data: messages }, { data: projects }] = await Promise.all([
    supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("projects")
      .select("*")
      .order("sort_order", { ascending: true }),
  ]);

  return (
    <AdminFrame email={user.email ?? ""}>
      <header className="mb-10"><p className="eyebrow mb-3">Your portfolio, orchestrated</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Command center</h1><p className="mt-3 text-muted">A quiet place to manage what the world sees.</p></header>
      <div className="mb-8 grid gap-4 sm:grid-cols-3">{[["Projects", projects?.length ?? 0], ["Published projects", projects?.filter(p => p.published).length ?? 0], ["Recent messages", messages?.length ?? 0]].map(([label, value]) => <div key={label} className="glass p-6"><p className="text-sm text-muted">{label}</p><p className="mt-3 text-4xl font-semibold">{value}</p></div>)}</div>
      <div className="grid gap-4 md:grid-cols-2">{[["settings", "Homepage & settings", "Identity, sections, appearance, and SEO."], ["projects", "Projects", "Curate your work and publishing order."], ["skills", "Skills", "Organize capabilities and categories."], ["journey", "Journey & building", "Your timeline and work in progress."], ["articles", "Articles", "Write and publish with the full article editor."], ["messages", "Messages", "Read and reply to portfolio inquiries."]].map(([path, title, detail]) => <Link key={path} href={`/admin/${path}`} className="g-border p-6 transition-colors hover:border-violet/50"><h2 className="font-semibold">{title} <span className="float-right text-violet">↗</span></h2><p className="mt-2 text-sm text-muted">{detail}</p></Link>)}</div>
    </AdminFrame>
  );
}
