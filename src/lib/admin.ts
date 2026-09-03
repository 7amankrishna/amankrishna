import { redirect } from "next/navigation";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

/** The only account allowed into the admin area. */
export const ADMIN_EMAIL = "7amankrishna@gmail.com";

/**
 * Non-redirecting admin check. Returns null when the caller is not the admin.
 *
 * Route handlers use this instead of {@link requireAdmin} because a JSON
 * endpoint wants a 401, not an HTML redirect — and catching Next's `redirect()`
 * control-flow exception to fake one is fragile.
 */
export async function getAdminSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  if ((user.email ?? "").toLowerCase() !== ADMIN_EMAIL) return null;

  return { supabase, user };
}

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
