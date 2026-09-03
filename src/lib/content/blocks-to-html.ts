import type { Block } from "@/lib/posts";

/**
 * Convert legacy block-editor content to the HTML shape the rich-text editor
 * uses.
 *
 * This is a *read-time* adapter, not a destructive migration: `posts.blocks`
 * is never overwritten by it. An old article renders through here until the
 * day someone opens it in the new editor and saves — at which point the
 * editor's own HTML is persisted to `content_html` and takes over.
 */

/** Escape text taken from a legacy block before it becomes markup. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Legacy paragraphs were plain textareas, so a blank line meant "new
 * paragraph" and a single newline meant "line break". Preserve both.
 */
function paragraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => `<p>${esc(chunk).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function blocksToHtml(blocks: Block[] | null | undefined): string {
  if (!blocks?.length) return "";

  const out: string[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case "paragraph":
        if (block.content.trim()) out.push(paragraphs(block.content));
        break;

      case "heading": {
        // Legacy levels were only ever 2 or 3; anything else clamps to 2 so
        // the article keeps a single H1 (the title).
        const level = block.meta?.level === 3 ? 3 : 2;
        if (block.content.trim())
          out.push(`<h${level}>${esc(block.content.trim())}</h${level}>`);
        break;
      }

      case "image":
        if (block.content.trim()) {
          const alt = esc(block.meta?.alt ?? "");
          out.push(
            `<img src="${esc(block.content.trim())}" alt="${alt}" loading="lazy" decoding="async">`,
          );
        }
        break;

      case "code":
        if (block.content.trim()) {
          const lang = block.meta?.lang?.trim();
          const cls = lang ? ` class="language-${esc(lang)}"` : "";
          out.push(`<pre><code${cls}>${esc(block.content)}</code></pre>`);
        }
        break;

      case "quote":
        if (block.content.trim())
          out.push(`<blockquote><p>${esc(block.content.trim())}</p></blockquote>`);
        break;

      case "list": {
        const items = (block.meta?.items ?? []).filter((i) => i.trim());
        if (items.length)
          out.push(
            `<ul>${items.map((i) => `<li><p>${esc(i.trim())}</p></li>`).join("")}</ul>`,
          );
        break;
      }

      case "divider":
        out.push("<hr>");
        break;
    }
  }

  return out.join("");
}

/**
 * The body HTML for a post, whichever format it was authored in.
 * Rich-text content wins; legacy blocks are the fallback.
 */
export function resolveBodyHtml(post: {
  content_html: string | null;
  blocks: Block[] | null;
}): string {
  const rich = post.content_html?.trim();
  if (rich) return rich;
  return blocksToHtml(post.blocks);
}
