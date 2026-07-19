import { requireAdmin } from "@/lib/admin";
import { ArticleForm } from "@/components/admin/article-form";

export const metadata = { title: "New article" };
export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  await requireAdmin();
  return <ArticleForm />;
}
