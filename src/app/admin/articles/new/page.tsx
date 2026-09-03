import { requireAdmin } from "@/lib/admin";
import { ArticleForm } from "@/components/admin/article-form";
import { getFontLibrary } from "@/lib/fonts/query";

export const metadata = { title: "New article" };
export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  await requireAdmin();
  // Fetched on the server so the font picker is populated on first paint
  // instead of popping in after a client round-trip.
  const library = await getFontLibrary();
  return <ArticleForm library={library} />;
}
