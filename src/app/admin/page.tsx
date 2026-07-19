import { redirect } from "next/navigation";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { AdminDashboard } from "@/components/admin/dashboard";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

/**
 * Admin dashboard — server-guarded by Supabase Auth.
 * Unauthenticated visitors are redirected to /login.
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
    <AdminDashboard
      email={user.email ?? ""}
      messages={messages ?? []}
      projects={projects ?? []}
    />
  );
}
