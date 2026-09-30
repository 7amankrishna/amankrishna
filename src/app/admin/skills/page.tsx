import { getAdminPortfolio } from "@/lib/admin-portfolio";
import { AdminFrame } from "@/components/admin/cms-panels";
import { CollectionManager } from "@/components/admin/collection-manager";
export const dynamic = "force-dynamic";
export default async function SkillsPage() { const { email, data } = await getAdminPortfolio(); return <AdminFrame email={email}>{data.error && <p role="alert" className="mb-4 text-red-400">Some CMS data could not be loaded. Check your database setup.</p>}<CollectionManager collection="skills" rows={data.skills} /></AdminFrame>; }
