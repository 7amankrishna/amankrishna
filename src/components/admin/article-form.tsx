"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Link2,
  Loader2,
  Save,
  Search,
  Tags,
  Trash2,
} from "lucide-react";
import {
  autosaveDraft,
  deletePost,
  savePost,
  type PostActionState,
} from "@/app/actions/posts";
import {
  EMPTY_SEO_FIELDS,
  SeoEditor,
  type SeoFields,
} from "@/components/editor/seo-editor";
import { RichTextEditor, type EditorSnapshot } from "@/components/editor/rich-text-editor";
import { SaveStatusBadge } from "@/components/editor/save-status";
import { resolveBodyHtml } from "@/lib/content/blocks-to-html";
import { useAutosave, type SaveOutcome } from "@/lib/editor/use-autosave";
import type { SiteFont } from "@/lib/fonts/types";
import { parseTagList, slugify, TAGS_MAX, type Post } from "@/lib/posts";
import { SITE } from "@/lib/site";

/**
 * The article form.
 *
 * It owns every field as controlled state for one reason: the SEO previews and
 * the checklist have to describe the draft as it is *right now*, and a preview
 * fed by `defaultValue` would describe the draft as it was when the page
 * loaded. The body is the exception — the editor owns the ProseMirror document
 * and reports snapshots up, because pushing 400KB of HTML through React state on
 * every keystroke would make typing feel like wading.
 *
 * Submission is a plain server action over the enclosing `<form>`, so the fields
 * post by `name` and the whole thing still works if hydration is slow or fails.
 * Autosave sits on top of that rather than replacing it.
 */

const fieldClass =
  "w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg placeholder:text-muted/60 focus:border-violet/60 focus:outline-none";

/** Pull the SEO slots out of a loaded row, with "" for every unset column. */
function seoFromPost(post?: Post): SeoFields {
  if (!post) return EMPTY_SEO_FIELDS;
  return {
    seo_title: post.seo_title ?? "",
    seo_description: post.seo_description ?? "",
    canonical_url: post.canonical_url ?? "",
    og_title: post.og_title ?? "",
    og_description: post.og_description ?? "",
    og_image: post.og_image ?? "",
    twitter_title: post.twitter_title ?? "",
    twitter_description: post.twitter_description ?? "",
    robots_index: post.robots_index ?? "index",
    robots_follow: post.robots_follow ?? "follow",
  };
}

export function ArticleForm({
  post,
  library,
}: {
  post?: Post;
  /** The font library, so the editor's picker is populated on first paint. */
  library: SiteFont[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<PostActionState, FormData>(
    savePost,
    null,
  );

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  // An existing article counts as touched: its URL is already public, so the
  // slug must never follow a title edit on its own.
  const [slugTouched, setSlugTouched] = useState(Boolean(post));
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [coverImage, setCoverImage] = useState(post?.cover_image ?? "");
  const [tags, setTags] = useState((post?.tags ?? []).join(", "));
  const [seo, setSeo] = useState<SeoFields>(() => seoFromPost(post));

  const initialHtml = useMemo(
    () => (post ? resolveBodyHtml(post) : ""),
    [post],
  );
  const [body, setBody] = useState<EditorSnapshot>(() => ({
    html: initialHtml,
    json: "",
    fonts: [],
  }));

  const effectiveSlug = slugTouched ? slug : slugify(title);
  const permalink = `${SITE.url}${SITE.blog.base}/${effectiveSlug || "…"}`;
  const tagList = useMemo(() => parseTagList(tags), [tags]);

  /**
   * The share image, resolved the same way the article's metadata will resolve
   * it. When nothing is set the generated card is used, and the preview says so
   * rather than showing a blank frame.
   */
  const ogImage = seo.og_image.trim() || coverImage.trim();
  const previewImage = ogImage || `${SITE.url}/opengraph-image`;

  /* ---- autosave --------------------------------------------------------- */

  /**
   * The `updated_at` this tab last saw. Every autosave is filtered on it, so a
   * second tab that saved in the meantime cannot be overwritten silently.
   */
  const seenUpdatedAt = useRef(post?.updated_at ?? "");

  const snapshot = useMemo(
    () => ({ title, excerpt, coverImage, tags, seo, html: body.html, json: body.json }),
    [title, excerpt, coverImage, tags, seo, body.html, body.json],
  );

  // Only a loaded draft. A published article is left alone so a live page never
  // picks up a half-written sentence, and a brand-new article has no row to
  // write to until the first explicit save creates one.
  const autosaveEnabled = Boolean(post && !post.published);

  const save = useCallback(
    async (data: typeof snapshot): Promise<SaveOutcome> => {
      if (!post) return { ok: false, message: "Save once to create the article first." };
      const result = await autosaveDraft({
        id: post.id,
        seenUpdatedAt: seenUpdatedAt.current,
        title: data.title,
        excerpt: data.excerpt,
        contentHtml: data.html,
        contentJson: data.json,
        coverImage: data.coverImage,
        tags: parseTagList(data.tags),
        seoTitle: data.seo.seo_title,
        seoDescription: data.seo.seo_description,
        canonicalUrl: data.seo.canonical_url,
        ogTitle: data.seo.og_title,
        ogDescription: data.seo.og_description,
        ogImage: data.seo.og_image,
        twitterTitle: data.seo.twitter_title,
        twitterDescription: data.seo.twitter_description,
        robotsIndex: data.seo.robots_index,
        robotsFollow: data.seo.robots_follow,
      });
      if (!result.ok) return { ok: false, message: result.message };
      seenUpdatedAt.current = result.updatedAt;
      return { ok: true };
    },
    [post],
  );

  const autosave = useAutosave({ data: snapshot, save, enabled: autosaveEnabled });
  const { markClean } = autosave;

  /**
   * Reconcile the form with what the server just did.
   *
   * A create has to navigate: staying on `/admin/articles/new` with the row
   * already inserted means the next Save inserts a second copy. Replacing the
   * URL also turns autosave on, because the form then loads a real row.
   */
  useEffect(() => {
    if (!state?.ok) return;
    if (state.updatedAt) seenUpdatedAt.current = state.updatedAt;
    if (state.slug) {
      setSlug(state.slug);
      setSlugTouched(true);
    }
    markClean();
    if (!post && state.id) router.replace(`/admin/articles/${state.id}`);
  }, [state, markClean, post, router]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <Link
        href="/admin/articles"
        className="mb-8 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-4" /> All articles
      </Link>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {post ? "Edit article" : "New article"}
        </h1>
        <SaveStatusBadge
          autosave={autosave}
          enabled={autosaveEnabled}
          disabledReason={
            post?.published
              ? "this article is live, so changes publish on save"
              : "autosave starts after the first save"
          }
        />
      </div>

      <form action={action} className="space-y-10">
        {post && <input type="hidden" name="id" value={post.id} />}
        {/* Tells the action whether a slug collision may be resolved with a
            numeric suffix or must be reported as an error. */}
        <input type="hidden" name="slug_auto" value={slugTouched ? "0" : "1"} />

        {/* Title + permalink */}
        <div className="space-y-3">
          <input
            name="title"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Article title"
            aria-label="Article title"
            className="w-full border-0 bg-transparent text-3xl font-semibold tracking-tight text-fg placeholder:text-muted/40 focus:outline-none"
          />
          <div className="glass flex items-center gap-2 px-4 py-2.5">
            <Link2 className="size-4 shrink-0 text-cyan" aria-hidden />
            <span className="shrink-0 font-mono text-xs text-muted">
              {SITE.host}
              {SITE.blog.base}/
            </span>
            <input
              name="slug"
              value={effectiveSlug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(slugify(event.target.value));
              }}
              placeholder="url-slug"
              aria-label="URL slug"
              className="min-w-0 flex-1 bg-transparent font-mono text-xs text-fg focus:outline-none"
            />
          </div>
          {post?.published && effectiveSlug !== post.slug && (
            <p className="text-xs text-amber-400">
              Changing a published URL leaves /blog/{post.slug} redirecting here.
              Inbound links keep working, but the old path stops being canonical.
            </p>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm text-muted">
              Excerpt — the blog index card, the RSS summary, and the fallback
              meta description
            </span>
            <textarea
              name="excerpt"
              rows={2}
              value={excerpt}
              onChange={(event) => setExcerpt(event.target.value)}
              placeholder="One or two sentences summarising the article."
              className={`${fieldClass} resize-none`}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm text-muted">Cover image URL</span>
            <input
              name="cover_image"
              type="url"
              value={coverImage}
              onChange={(event) => setCoverImage(event.target.value)}
              placeholder="https://…"
              className={fieldClass}
            />
            <span className="mt-1 block text-xs text-muted">
              Shown on the blog index, and used for sharing unless an Open Graph
              image is set.
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-sm text-muted">
                <Tags className="size-3.5" aria-hidden /> Tags
              </span>
              <span className="font-mono text-xs text-muted">
                {tagList.length} / {TAGS_MAX}
              </span>
            </span>
            <input
              name="tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="machine learning, nextjs"
              className={fieldClass}
            />
            <span className="mt-1 block text-xs text-muted">
              Comma separated. Used for related articles and the /blog filter.
            </span>
          </label>
        </div>

        <section>
          <h2 className="mb-2 text-sm text-muted">Content</h2>
          <RichTextEditor
            initialHtml={initialHtml}
            initialJson={post?.content_json ?? null}
            library={library}
            title={title}
            placeholder="Write the article…"
            onChange={setBody}
          />
        </section>

        <details className="g-border p-5 sm:p-6" open={Boolean(post)}>
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <Search className="size-4 text-violet" aria-hidden /> SEO &amp; sharing
            <span className="font-normal text-muted">
              — how this appears in search and on social
            </span>
          </summary>
          <div className="mt-6">
            <SeoEditor
              fields={seo}
              onChange={(patch) => setSeo((prev) => ({ ...prev, ...patch }))}
              title={title}
              slug={effectiveSlug}
              excerpt={excerpt}
              bodyHtml={body.html}
              tagCount={tagList.length}
              publishedAt={post?.published_at ?? null}
              image={previewImage}
              imageIsGenerated={!ogImage}
            />
          </div>
        </details>

        <div className="flex flex-wrap items-center gap-4 border-t border-line pt-6">
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
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Save className="size-4" aria-hidden />
            )}
            {pending ? "Saving…" : "Save article"}
          </button>

          <a
            href={permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted underline decoration-dotted transition-colors hover:text-fg"
          >
            {post?.published ? "View live article" : "Preview URL"}
          </a>

          {state && (
            <p
              role="status"
              className={`flex items-center gap-2 text-sm ${
                state.ok ? "text-cyan" : "text-red-400"
              }`}
            >
              {state.ok ? (
                <CheckCircle2 className="size-4 shrink-0" aria-hidden />
              ) : (
                <AlertCircle className="size-4 shrink-0" aria-hidden />
              )}
              {state.message}
            </p>
          )}
        </div>
      </form>

      {/* Danger zone — a separate form so it cannot submit the editor. */}
      {post && (
        <form
          action={deletePost}
          className="mt-12 border-t border-line pt-6"
          onSubmit={(event) => {
            if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) {
              event.preventDefault();
            }
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
