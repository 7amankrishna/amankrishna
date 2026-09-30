import { requireAdmin } from "@/lib/admin";
import { AdminFrame } from "@/components/admin/cms-panels";
import { MediaManager } from "@/components/admin/media-manager";
export const dynamic = "force-dynamic";
export default async function MediaPage() { const { supabase, user } = await requireAdmin(); const bucket = supabase.storage.from("portfolio-media"); const { data, error } = await bucket.list("", { limit: 200, sortBy: { column: "created_at", order: "desc" } }); const files = (data ?? []).map(file => ({ name: file.name, id: file.id ?? undefined, updated_at: file.updated_at ?? undefined, created_at: file.created_at ?? undefined, metadata: file.metadata, publicUrl: bucket.getPublicUrl(file.name).data.publicUrl })); return <AdminFrame email={user.email ?? ""}>{error ? <p role="alert" className="text-red-400">Media could not be listed: {error.message}</p> : <MediaManager files={files} />}</AdminFrame>; }
