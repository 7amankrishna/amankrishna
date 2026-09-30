import { getAdminPortfolio } from "@/lib/admin-portfolio";
import { AdminFrame } from "@/components/admin/cms-panels";
import { SettingsForm } from "@/components/admin/settings-form";
export const dynamic = "force-dynamic";
export default async function SettingsPage() { const { email, data } = await getAdminPortfolio(); return <AdminFrame email={email}>{data.error ? <p role="alert" className="mb-4 text-red-400">CMS data could not be loaded. Check your Supabase connection and migrations before editing.</p> : <SettingsForm initial={data.settings} />}</AdminFrame>; }
