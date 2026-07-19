"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { savePost, deletePost, type PostActionState } from "@/app/actions/posts";
import { BlockEditor } from "@/components/admin/block-editor";
import { slugify, type Post } from "@/lib/posts";
import { SITE } from "@/lib/utils";
import {
  ArrowLeft,
  Save,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Search,
  Link2,
} from "lucide-react";

const fieldClass =
  "w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg placeholder:text-muted/60 focus:border-violet/60 focus:outline-none";

/** Full article editor: metadata, SEO, permalink preview, block editor. */
export function ArticleForm({ post }: { post?: Post }) {
  const [state, action, pending] = useActionState<PostActionState, FormData>(
    savePost,
    null,
  );
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!post);

  // Auto-derive slug from title until the user edits the slug directly.
  const effectiveSlug = slugTouched ? slug : slugify(title);
  const permalink = `${SITE.url}/blog/${effectiveSlug || "…"}`;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/admin/articles"
        className="mb-8 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-4" /> All articles
      </Link>

      <h1 className="mb-8 text-2xl font-semibold tracking-tight">
        {post ? "Edit article" : "New article"}
      </h1>

      <form action={action} className="space-y-8">
        {post && <input type="hidden" name="id" value={post.id} />}

        {/* Title + permalink */}
        <div className="space-y-3">
          <input
            name="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Article title"
            className="w-full border-0 bg-transparent text-3xl font-semibold tracking-tight text-fg placeholder:text-muted/40 focus:outline-none"
          />
          <div className="glass flex items-center gap-2 px-4 py-2.5">
            <Link2 className="size-4 shrink-0 text-cyan" />
            <span className="truncate font-mono text-xs text-muted">
              {SITE.url}/blog/
            </span>
            <input
              name="slug"
              value={effectiveSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              placeholder="url-slug"
              aria-label="URL slug"
              className="min-w-0 flex-1 bg-transparent font-mono text-xs text-fg focus:outline-none"
            />
          </div>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">
            Excerpt — shown on the blog index
          </span>
          <textarea
            name="excerpt"
            rows={2}
            defaultValue={post?.excerpt ?? ""}
            placeholder="One or two sentences summarizing the article."
            className={`${fieldClass} resize-none`}
          />
        </label>

        {/* Content blocks */}
        <div>
          <span className="mb-2 block text-sm text-muted">Content</span>
          <BlockEditor initial={post?.blocks ?? []} />
        </div>

        {/* SEO panel */}
        <details className="g-border p-5" open={!!post?.seo_title}>
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <Search className="size-4 text-violet" /> SEO
            <span className="font-normal text-muted">
              — search & social appearance
            </span>
          </summary>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm text-muted">
                SEO title <span className="font-mono text-xs">(≤60 chars, falls back to title)</span>
              </span>
              <input
                name="seo_title"
                maxLength={60}
                defaultValue={post?.seo_title ?? ""}
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-muted">
                Meta description <span className="font-mono text-xs">(≤160 chars)</span>
              </span>
              <textarea
                name="seo_description"
                rows={2}
                maxLength={160}
                defaultValue={post?.seo_description ?? ""}
                className={`${fieldClass} resize-none`}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-muted">
                Cover image URL — used for Open Graph
              </span>
              <input
                name="cover_image"
                defaultValue={post?.cover_image ?? ""}
                placeholder="https://…"
                className={fieldClass}
              />
            </label>
            {/* Google-style preview */}
            <div className="rounded-xl border border-line p-4">
              <p className="truncate text-sm text-blue">{permalink}</p>
              <p className="truncate text-lg text-violet">
                {(post?.seo_title || title) || "SEO title preview"}
              </p>
              <p className="line-clamp-2 text-sm text-muted">
                {post?.seo_description || "Meta description preview appears here."}
              </p>
            </div>
          </div>
        </details>

        {/* Publish controls */}
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="published"
              defaultChecked={post?.published}
              className="size-4 accent-[#7c5cff]"
            />
            Published
          </label>

          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-xl bg-fg px-6 py-2.5 text-sm font-medium text-ink transition-all hover:opacity-90 disabled:opacity-60"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {pending ? "Saving…" : "Save article"}
          </button>

          {state && (
            <p
              role="status"
              className={`flex items-center gap-2 text-sm ${state.ok ? "text-cyan" : "text-red-400"}`}
            >
              {state.ok ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
              {state.message}
            </p>
          )}
        </div>
      </form>

      {/* Danger zone — separate form so it doesn't submit the editor */}
      {post && (
        <form
          action={deletePost}
          className="mt-12 border-t border-line pt-6"
          onSubmit={(e) => {
            if (!confirm(`Delete "${post.title}"? This cannot be undone.`))
              e.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={post.id} />
          <button
            type="submit"
            className="inline-flex items-center gap-2 text-sm text-red-400 transition-colors hover:text-red-300"
          >
            <Trash2 className="size-4" /> Delete article
          </button>
        </form>
      )}
    </main>
  );
}
