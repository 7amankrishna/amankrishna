import { requireAdmin } from "@/lib/admin";
import { AdminFrame } from "@/components/admin/cms-panels";
import { MessagesPanel } from "@/components/admin/messages-panel";
export const dynamic = "force-dynamic";
export default async function MessagesPage() {
  const { supabase, user } = await requireAdmin();
  const { data, error } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false });
  return <AdminFrame email={user.email ?? ""}>{error ? <p role="alert" className="text-red-400">Messages could not be loaded. Please try again.</p> : <MessagesPanel messages={data ?? []} />}</AdminFrame>;
}
