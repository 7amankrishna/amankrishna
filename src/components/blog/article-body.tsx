import { resolveBodyHtml } from "@/lib/content/blocks-to-html";
import { sanitizeArticleHtml } from "@/lib/content/sanitize";
import type { Block } from "@/lib/posts";
import { cn } from "@/lib/utils";

/**
 * The one place an article body becomes HTML.
 *
 * Both content formats arrive here: `content_html` from the rich-text editor,
 * and the legacy `blocks` array from the block editor. `resolveBodyHtml` picks
 * whichever the post actually has, so an article written in 2024 renders without
 * anyone rewriting its row.
 *
 * The HTML is sanitised *again* on the way out even though it was already
 * sanitised on the way in. That is deliberate: the stored column is the output
 * of whatever the sanitiser rules were on the day it was saved, and re-running
 * them at render time means tightening a rule protects existing rows
 * immediately rather than at their next edit. It also means a row written
 * directly through the Supabase dashboard, bypassing the save action entirely,
 * still cannot inject a script.
 */

export function ArticleBody({
  post,
  className,
}: {
  post: { content_html: string | null; blocks: Block[] | null };
  className?: string;
}) {
  const html = sanitizeArticleHtml(resolveBodyHtml(post));
  if (!html) return null;

  return (
    <div
      className={cn("prose-article", className)}
      // Sanitised immediately above; see the note on double sanitisation.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
