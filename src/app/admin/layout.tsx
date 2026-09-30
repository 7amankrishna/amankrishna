import type { Metadata } from "next";
import { requireAdmin, supabaseConfigured } from "@/lib/admin";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!supabaseConfigured()) return <main className="mx-auto flex min-h-svh max-w-xl items-center p-6"><div className="glass p-8"><h1 className="text-xl font-semibold">Configure Supabase</h1><p className="mt-3 text-sm text-muted">Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then apply the Supabase schema and migrations to enable the command center.</p></div></main>;
  await requireAdmin();
  return children;
}
