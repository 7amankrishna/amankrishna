import { redirect } from "next/navigation";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

/** The only account allowed into the admin area. */
export const ADMIN_EMAIL = "7amankrishna@gmail.com";

/**
 * Server-side admin guard. Redirects to /login when signed out and
 * to / when signed in as anyone other than the admin.
 * (RLS enforces the same email check at the database layer, so even a
 * bypassed guard cannot read or write admin data.)
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if ((user.email ?? "").toLowerCase() !== ADMIN_EMAIL) redirect("/");

  return { supabase, user };
}

export { supabaseConfigured };
