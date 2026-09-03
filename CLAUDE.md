# CLAUDE.md — Handoff for the next Claude Code session

**Repo:** `C:\Users\Aman Krishna\Desktop\amankrishna`
**GitHub:** `7amankrishna/amankrishna` · **Branch:** `main`
**Production domain:** `https://AmanKrishna.in` (canonical — never expose a `*.vercel.app` host in public SEO)
**LinkedIn:** `https://www.linkedin.com/in/7amankrishna`
**Written:** 2026-09-04, at the end of a long implementation session that was compacted twice.

---

# ⚠️ CURRENT STATE — updated 2026-09-04, supersedes §§0, 7, 9–13 below

The sections further down were written **mid-upgrade** and are now stale in the
places listed here. Where they disagree with this block, **this block is right**.
Full detail: [`docs/UPGRADE-REPORT.md`](docs/UPGRADE-REPORT.md).

**The public-page half is now built.** Specifically, every item §12 lists as
"NOT DONE" is done:

- `src/app/blog/[slug]/page.tsx` is rewritten — renders `resolveBodyHtml` through
  `ArticleBody`, keeps `BlockRenderer` for legacy `blocks`-only articles, resolves
  `post_slug_history` with a **308**, mounts `<ArticleFonts>`, honours per-article
  `robots_index`/`robots_follow`, and emits a JSON-LD `@graph` with breadcrumbs,
  author card, related posts and prev/next.
- Created: `src/lib/seo/metadata.ts`, `src/lib/seo/jsonld.ts`,
  `src/components/seo/structured-data.tsx`,
  `src/app/blog/[slug]/opengraph-image.tsx`, `src/app/feed.xml/route.ts`.
- `src/app/blog/page.tsx` — tag filtering, canonical pinned to bare `/blog`.
- `sitemap.ts` — no fabricated `lastmod`, excludes `noindex`.
- `robots.ts` — also disallows `/login` and `/api`.
- `layout.tsx` — `og:site_name` is now `"AmanKrishna.in"`.
- `next.config.ts` — `outputFileTracingRoot` fixes the workspace-root warning.
- `src/app/opengraph-image.tsx` — `runtime = "edge"` removed, so it prerenders.

**§7 is wrong: the migration IS applied** and was manually verified by the owner.
Do not re-run or investigate it.

**§10 is wrong: all four gates pass.** `npx tsc --noEmit` 0 · `npx eslint` 0 ·
`npm run check` 49 + 25 assertions · `npx next build --turbopack` 0, 13/13 static
pages, no edge warning.

**§13's six "bugs/gaps" are all fixed.** The open questions are answered:
`.env.example` and `README.md` now document every variable that is actually read;
`GITHUB_TOKEN` was removed because `src/lib/github.ts` sends no auth header;
`brand-icons.tsx` exports both `Github` and `Linkedin`.

**There is a test harness now** — `npm run check`, zero new dependencies (Node
native type-stripping + a `resolve` hook for the `@/` alias). §10's "no test
framework is installed" is out of date.

**Still not verified, and needs your credentials — no `.env.local` exists:** live
save/autosave, the font library end to end, comparing the editor's previews
against a real published article's `<head>`, the preview-deployment canonical
check, and the 375 px / keyboard passes through the live editor. Everything else
in §14's constraint list holds. See §10 of the report.

**§0's tagging convention still applies to the sections below.** They remain
useful for architecture, conventions and the environment gotchas — just not for
status.

---

## 0. How to read this file

An in-flight upgrade is **partially landed**. The admin/editor half is built; the
public-page half is largely **not wired up yet**. Nothing is committed.

Every claim below is tagged:

- **[verified]** — I read the file or ran the command in this handoff pass.
- **[from session]** — built earlier in the session and believed correct, but **not
  re-read** while writing this file. Re-open before you rely on the details.
- **[unverified]** — never confirmed. Treat as a question, not a fact.

Do not trust a **[from session]** line over the code. Read the file.

---

## 1. Project architecture **[verified]**

Next.js 15.5.20 App Router + React 19.1.0, TypeScript 5 `strict`, **Turbopack for
both `dev` and `build`**. Tailwind CSS v4 (`@theme` tokens in
`src/app/globals.css`; no `tailwind.config.js`, no `@tailwindcss/typography`).
Supabase Postgres + `@supabase/ssr` for data and auth, with RLS and a
`public.is_admin()` predicate. Server Components by default; mutations go through
Server Actions (`"use server"`) rather than API routes — the one API route that
exists is a proxy that needs a secret.

Path alias `@/*` → `./src/*`. Scripts: `npm run dev`, `npm run build`,
`npm run lint` (`eslint`), `npm run typecheck` (`tsc --noEmit`).

The Supabase client is **untyped** — there are no generated `Database` types. The
established convention in this repo is a cast at the call site (`as Post`,
`as { id?: string; updated_at?: string } | null`). Follow it; do **not** introduce
`any`.

Layering that the session deliberately established — keep it:

```
src/lib/site.ts            canonical identity (domain, author, blog paths)
src/lib/posts.ts           data model + slug/tag rules (isomorphic)
src/lib/content/           sanitization, schema, block→HTML, stats
src/lib/fonts/             font catalog, CSS building, extraction, queries
src/lib/seo/               field resolution + advisory checklist
src/lib/editor/            TipTap extensions, upload, autosave hook
src/components/editor/     editor UI (toolbar, dialogs, previews)
src/app/actions/           server actions (persistence)
```

---

## 2. Git state **[verified]**

Nothing from this upgrade is committed. `git log` still ends at the pre-upgrade
commit `6494693 Admin panel: add/edit/remove projects, delete messages, dynamic
homepage projects`.

**Do not commit or push** unless the user asks.

### Modified (10)

```
 M package.json                          +20/-1   (TipTap ×15, sanitize-html, typecheck script)
 M package-lock.json                     +992     (lockfile for the above)
 M src/app/actions/posts.ts              +585     (SEO columns, autosave, slug history)
 M src/app/admin/articles/[id]/page.tsx  +12/-4   (Promise.all + font library)
 M src/app/admin/articles/new/page.tsx   +6/-2    (font library)
 M src/app/globals.css                   +291     (article/prose + editor styles)
 M src/components/admin/article-form.tsx +402     (full rewrite)
 M src/lib/admin.ts                      +19      (requireAdmin returns supabase)
 M src/lib/posts.ts                      +121     (SEO columns, slug rules, tags)
 M src/lib/utils.ts                      +26/-?   (SITE now derived from lib/site.ts)
```

Total: **2305 insertions, 169 deletions** across tracked files.

### New / untracked — 42 source files + 1 migration

```
src/lib/site.ts
src/lib/seo/fields.ts                       src/lib/seo/checklist.ts
src/lib/content/schema.ts                   src/lib/content/sanitize.ts
src/lib/content/scrub-client.ts             src/lib/content/blocks-to-html.ts
src/lib/content/stats.ts                    src/lib/content/analyze.ts
src/lib/fonts/types.ts                      src/lib/fonts/catalog.ts
src/lib/fonts/css.ts                        src/lib/fonts/extract.ts
src/lib/fonts/query.ts                      src/lib/fonts/use-font-loader.ts
src/lib/editor/constants.ts                 src/lib/editor/upload.ts
src/lib/editor/use-autosave.ts              src/lib/editor/extensions/index.ts
src/lib/editor/extensions/figure.ts         src/lib/editor/extensions/figure-view.tsx
src/lib/editor/extensions/block-style.ts
src/components/editor/rich-text-editor.tsx  src/components/editor/editor-toolbar.tsx
src/components/editor/bubble-menu.tsx       src/components/editor/primitives.tsx
src/components/editor/font-controls.tsx     src/components/editor/font-manager.tsx
src/components/editor/spacing-controls.tsx  src/components/editor/link-dialog.tsx
src/components/editor/image-dialog.tsx      src/components/editor/editor-stats.tsx
src/components/editor/article-preview.tsx   src/components/editor/seo-editor.tsx
src/components/editor/seo-checklist.tsx     src/components/editor/save-status.tsx
src/components/editor/google-search-preview.tsx
src/components/editor/social-preview.tsx
src/components/fonts/article-fonts.tsx      src/components/blog/article-body.tsx
src/app/actions/fonts.ts                    src/app/api/fonts/google/route.ts
supabase/migrations/20260903_editor_seo_fonts.sql
```

`src/components/ui/brand-icons.tsx` **already exists and is already committed** —
reuse it for the LinkedIn glyph. `lucide-react@1.25` dropped brand icons, so
`Linkedin` is **not** importable from lucide.

---

## 3. Dependencies added **[verified from `git diff package.json`]**

All TipTap packages are **exact-pinned to `3.31.0`** (no caret) — keep them in
lockstep; a mixed-version ProseMirror tree breaks at runtime, not at compile time.

```
@tiptap/core  @tiptap/pm  @tiptap/react  @tiptap/starter-kit  @tiptap/extensions
@tiptap/extension-bubble-menu  @tiptap/extension-highlight
@tiptap/extension-image  @tiptap/extension-link  @tiptap/extension-list
@tiptap/extension-subscript  @tiptap/extension-superscript
@tiptap/extension-text-align  @tiptap/extension-text-style
@tiptap/extension-underline
sanitize-html            2.17.7   (runtime, Node-only)
@types/sanitize-html     2.16.0   (dev)
```

Also added: the `"typecheck": "tsc --noEmit"` script.

Nothing else was installed. **Do not add dependencies** without a clear reason —
that was an explicit constraint.

---

## 4. Environment variables **[verified by grepping `process.env` across `src/`]**

| Variable | Used in | Required? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `src/lib/supabase/{server,client}.ts` | yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `src/lib/supabase/{server,client}.ts` | yes |
| `NEXT_PUBLIC_SITE_URL` | `src/lib/site.ts:23` | no — defaults to `https://amankrishna.in` |
| `GOOGLE_FONTS_API_KEY` | `src/app/api/fonts/google/route.ts:136` | only for browsing the Google Fonts catalog in the font manager |
| `NEXT_PUBLIC_FONT_CSS_ORIGIN` | `src/lib/fonts/css.ts:23` | no — optional privacy mirror (e.g. bunny.net) |

`.env.example` exists at the repo root but was **not read** in this pass —
**[unverified]** whether the three newer variables are documented there. Check and
add them if missing.

Critical: `src/lib/site.ts` intentionally does **not** read `VERCEL_URL`. Leave it
that way. Only set `NEXT_PUBLIC_SITE_URL` if the domain genuinely moves — never for
previews.

---

## 5. Site configuration **[verified — `src/lib/site.ts`]**

`src/lib/site.ts` is the single source of truth. `SITE.url` is
`NEXT_PUBLIC_SITE_URL || "https://amankrishna.in"`, trailing slash stripped;
`SITE.host` is the bare host for breadcrumb/preview labels; `SITE.name` is
`"AmanKrishna.in"` (this is the intended `og:site_name`). Helpers: `absoluteUrl()`,
`postUrl(slug)`, and `AUTHOR_SAME_AS` (LinkedIn + GitHub only — **do not invent
social profiles**).

`src/lib/utils.ts` re-exports a **flat, person-centric** `SITE` derived from
`lib/site.ts`, kept for the existing portfolio sections/navbar/footer. Note the
difference, it matters:

```
lib/site.ts  → SITE.name === "AmanKrishna.in"
lib/utils.ts → SITE.name === "Aman Krishna"   (author.name)
```

`layout.tsx`, `sitemap.ts`, `robots.ts` and `blog/[slug]/page.tsx` all still import
the **flat** `SITE` from `@/lib/utils`, so today `og:siteName` resolves to
`"Aman Krishna"`, not `"AmanKrishna.in"`. That is a real, open discrepancy — see §12.

---

## 6. Data model **[verified — `src/lib/posts.ts`]**

`Post` covers: `id, slug, title, excerpt, blocks, content_html, content_json,
seo_title, seo_description, canonical_url, og_title, og_description, og_image,
twitter_title, twitter_description, cover_image, fonts, tags, robots_index,
robots_follow, published, published_at, created_at, updated_at`.

**Backward compatibility is by design, not by migration.** `blocks` (the legacy
dnd-kit block editor format) is still on the type and still in the table.
`content_html` is `null` on pre-upgrade articles. `resolveBodyHtml(post)` in
`src/lib/content/blocks-to-html.ts` is the bridge: HTML when present, otherwise
blocks converted to HTML. **[from session]** Nothing in this upgrade rewrites or
destroys existing content.

Also exported: `slugify`, `isValidSlug`, `slugProblem`, `SLUG_PATTERN`,
`SLUG_MAX_LENGTH = 96`, a `RESERVED_SLUGS` set (`admin api blog login feed sitemap
robots manifest new edit`), `TAG_MAX_LENGTH = 48`, `TAGS_MAX = 12`, and
`parseTagList()` — isomorphic on purpose so the form and the action cannot disagree
about a trailing comma.

---

## 7. Supabase — migration status ⚠️ **[verified file contents; application UNVERIFIED]**

`supabase/migrations/20260903_editor_seo_fonts.sql` is written and idempotent
(`add column if not exists`, `create table if not exists`, `drop policy if
exists` before each `create policy`). **There is no evidence in this session that it
has ever been run against any database.** Assume it has NOT been applied.

If it has not been applied, every SEO column write fails and the editor cannot save.
**Verify this first.**

What it does:

- **`posts`** — adds `content_html text`, `content_json jsonb`,
  `fonts text[] not null default '{}'`, `canonical_url`, `og_title`,
  `og_description`, `og_image`, `twitter_title`, `twitter_description`,
  `tags text[] not null default '{}'`, `robots_index text default 'index'`,
  `robots_follow text default 'follow'`; check constraints
  `posts_robots_index_check` / `posts_robots_follow_check`; a partial index
  `posts_published_at_idx … where published`; a GIN index `posts_tags_idx` on tags.
  **`blocks` is untouched.**
- **`post_slug_history`** — `slug text primary key` (with the same
  `^[a-z0-9]+(-[a-z0-9]+)*$` check as posts), `post_id uuid references posts on
  delete cascade`, `created_at`. RLS on: public `select` (an anonymous request has
  to resolve the redirect), admin-only write via `public.is_admin()`.
- **`site_fonts`** — `family` (unique, 1–100 chars), `source in ('google','custom')`,
  `weights int[] default '{400,700}'`, `style in ('normal','italic')`, `url`,
  `fallback text default 'sans-serif'`, plus constraint
  `site_fonts_url_matches_source` (custom ⇒ url required, google ⇒ url must be
  null). RLS: public read, admin-only write.
- **Storage** — creates the public bucket `article-images` and four
  `storage.objects` policies: public read; insert/update/delete gated on
  `bucket_id = 'article-images' and public.is_admin()`.

Prerequisites the migration assumes already exist (from `supabase/schema.sql`):
`public.posts`, `public.is_admin()`, and the `posts_touch` BEFORE UPDATE trigger
calling `public.touch_updated_at()`. **The autosave compare-and-swap depends on that
trigger actually bumping `updated_at`** — if it does not fire, every autosave after
the first will report `stale`.

### How to apply

Supabase SQL editor → paste the file → run. Or, with the Supabase CLI linked:

```bash
supabase db push
```

---

## 8. What is COMPLETE

### 8.1 Sanitization / security **[verified — `src/lib/content/sanitize.ts`]**

`sanitizeArticleHtml()` wraps `sanitize-html` with the allow-lists from
`src/lib/content/schema.ts` and is applied **twice on purpose**: in the save action
(so the DB never holds hostile markup) and in the renderer (so pre-existing rows are
safe too). Specifics that are easy to break, so leave them alone:

- `script`, `iframe`, `object`, `embed`, `form`, `style` and all `on*` handlers are
  absent from the allow-list, therefore dropped.
- `nonTextTags` drops the *text* of `script`/`style`/`textarea`/`option`/`noscript`.
- `allowedClasses` permits `class` **only** on `<code>`, only matching
  `/^language-[\w+-]{1,20}$/`.
- `<a>`: an unsafe `href` degrades to `<span>` (text kept, link lost);
  `target="_blank"` **forces** `rel="noopener noreferrer"`.
- `<img>`: unsafe `src` degrades to `<span>`; `alt` is always emitted (empty is
  valid for decorative); `loading="lazy"` + `decoding="async"` are forced;
  `data:` URIs allowed for `img` only, so a pasted screenshot survives.
- `<input>`: rewritten to a `disabled` checkbox — task-list boxes must never be
  interactive on a published page.
- `allowProtocolRelative: true`.
- `htmlToPlainText()` is the shared helper for word count / reading time /
  auto-excerpt.

Client mirror: `src/lib/content/scrub-client.ts` (`scrubForPreview`) — `sanitize.ts`
is **Node-only, never import it into a client component**. **[from session]**

CSS injection is closed **at the sanitizer**, not merely at the extractor — this was
proven, see §11.

### 8.2 Save + autosave **[verified — `src/app/actions/posts.ts`]**

`savePost(prev, formData)` — sanitizes the body, then recomputes `fonts` from the
**sanitised** HTML rather than trusting the client's list; validates the three URL
fields with `isSafeUrl`; validates the slug; resolves collisions; stamps
`published_at` exactly once and never clears it; writes `blocks` **only** when the
form actually posted them (so a legacy article keeps its block content); catches
Postgres `23505` as a save-time slug race. Returns `{ ok, message, slug, id,
updatedAt }`. Caps live in `LIMITS` (title 300, excerpt 600, seo 300/600, url 2048,
tag 48, tags 12, html 400 000).

Returning `id` is what fixed the **duplicate-insert bug**: the old form stayed on
`/admin/articles/new` after a create, so a second Save inserted a second article.
The form now does `router.replace('/admin/articles/' + state.id)`.

`autosaveDraft(input)` — drafts only. Two deliberate refusals: a **published**
article is never autosaved (`reason: "published"`), and a **stale** write is refused
rather than merged. The stale check is a compare-and-swap through PostgREST:
`.eq("id", id).eq("updated_at", seenUpdatedAt)` — 0 rows matched ⇒ another tab wrote
first ⇒ `reason: "stale"`. Slug, publication state and `published_at` are absent from
the payload on purpose; autosave only ever moves body and metadata. A bad URL is
dropped rather than failing the save, so a typo cannot stall the loop.

`deletePost(formData)` — deletes, revalidates, redirects to `/admin/articles`.

### 8.3 Slug generation and history **[verified — `posts.ts` action + migration]**

`slugify(title)` handles NFKD accents, `&` → `and`, apostrophes, punctuation, and
caps at 96 chars. The form marks the slug "auto" (`slug_auto=1`) until the author
edits the field; **an existing article counts as touched from the start**, so a title
edit can never silently move a live URL.

- auto + collision ⇒ `base-2`, `base-3`, … (max 10 probes, then an error)
- typed + collision ⇒ **error, never a silent suffix**
- `slugConflict()` checks **both** `posts.slug` and `post_slug_history.slug` — letting
  a new article claim a slug that currently 301s elsewhere would turn one working URL
  into two conflicting ones.
- On rename: if the old slug was **published**, it is upserted into
  `post_slug_history`; the new slug is deleted from that table (in case an earlier
  rename is being undone); `revalidatePath` fires for the old path.

⚠️ **The 301 itself does not exist yet.** The history rows are being written, but
nothing reads them — `src/app/blog/[slug]/page.tsx` still 404s on an old slug. See §12.

### 8.4 Article form **[verified — `src/components/admin/article-form.tsx`]**

415 lines. Every field is controlled state, because the SEO previews and checklist
have to describe the draft *right now*. The body is the deliberate exception: the
editor owns the ProseMirror document and reports snapshots up, because pushing 400 KB
of HTML through React state per keystroke makes typing feel like wading.

Submission is a plain Server Action over the enclosing `<form>` with fields posting
by `name`, so it still works if hydration is slow or fails. Autosave sits on top
rather than replacing it. `autosaveEnabled = Boolean(post && !post.published)`.
`seenUpdatedAt` is a ref advanced by both `autosaveDraft` and `savePost`.

Two React traps that were hit and fixed — do not undo them: `onChange={setBody}`
passes the referentially-stable `useState` setter (an inline lambda re-fires the
editor's effect every render), and the reconcile effect depends on the destructured
`markClean` (a `useCallback(…, [])`) rather than the whole `autosave` object, whose
identity changes every render and loops.

### 8.5 Editor stack **[from session — not re-read in this pass]**

TipTap 3.31 with `useEditor({ immediatelyRender: false })`, so the hook returns
`Editor | null` — the null branch is load-bearing for SSR.

| File | Role |
|---|---|
| `rich-text-editor.tsx` | shell; posts `content_html` + `content_json` via a `formdata` event listener |
| `editor-toolbar.tsx` | grouped sticky responsive toolbar, active states, tooltips |
| `bubble-menu.tsx` | floating selection menu |
| `font-controls.tsx` / `spacing-controls.tsx` | family, size 12–64 + custom; line-height, letter-spacing, paragraph spacing |
| `font-manager.tsx` | add/remove library fonts, Google search, custom URL + weights |
| `link-dialog.tsx` | href + nofollow / sponsored / new-tab |
| `image-dialog.tsx` | upload, URL, drag-drop; alt, caption, alignment, width |
| `extensions/figure.ts` + `figure-view.tsx` | `setFigure()` node with caption/align/width and drag-resize |
| `extensions/block-style.ts` | per-block inline style attributes |
| `editor-stats.tsx` | word count + reading time |
| `article-preview.tsx` | Edit \| Preview with desktop/mobile widths |
| `primitives.tsx` | shared `Modal`, `Field`, `fieldClass` |
| `lib/editor/upload.ts` | `uploadArticleImage`, `MAX_UPLOAD_BYTES`, `ACCEPT_ATTRIBUTE` |

Notably, `rich-text-editor.tsx` deliberately **no longer posts a `fonts` field** — the
server recomputes it from sanitised HTML, and posting a list the server ignores only
invites the belief that the client decides which fonts a public page loads.

### 8.6 Font library **[from session; `site_fonts` schema verified]**

`src/lib/fonts/types.ts` (`SiteFont`, `SYSTEM_FONTS`, `isSystemFamily`, `findFont`,
`WEIGHT_LABELS`, `OFFERED_WEIGHTS`) · `catalog.ts` · `css.ts` (builds the Google
CSS2 URL, honours `NEXT_PUBLIC_FONT_CSS_ORIGIN` as a privacy mirror, and emits
`@font-face` for custom URLs) · `extract.ts` (`extractFontFamilies(html)`) ·
`query.ts` (`getFontLibrary()`, `getFontsForFamilies(families)`) ·
`use-font-loader.ts` (client-side loading inside the editor).

`src/app/api/fonts/google/route.ts` proxies the Google Fonts **Developer API** so
`GOOGLE_FONTS_API_KEY` stays server-side. `src/app/actions/fonts.ts` persists library
changes. `src/components/fonts/article-fonts.tsx` is the public-page `<link>`/
`@font-face` emitter.

Only the families a given article actually references get a stylesheet, which is why
`posts.fonts` exists as a column and why it is recomputed server-side. **Adding a font
to the library costs published pages nothing.**

⚠️ `article-fonts.tsx` is written but **not imported anywhere on the public blog
page** — see §12.

### 8.7 SEO editor **[from session]**

`src/lib/seo/fields.ts` — the one isomorphic resolution chain, so a preview can never
disagree with the shipped tag:

```
title       = seo_title      || title
description = seo_description || excerpt || summarize(bodyHtml, 155)
ogTitle     = og_title       || title
ogDescription = og_description || description
twitterTitle  = twitter_title  || ogTitle
twitterDescription = twitter_description || ogDescription
```

Plus `SEO_LENGTHS` (title 15–60, description 70–160, excerpt 40–300),
`lengthNote()`, `breadcrumbUrl()`. **Nothing truncates.** There is no `maxLength`
anywhere in the SEO editor — the old form silently ate the end of a pasted sentence.
Counters and an amber note say the same thing without touching the value.

`src/lib/seo/checklist.ts` — `runChecklist()` returns typed advisory items
(`pass | warn | info`) and `countWarnings()`. **Deliberately no score.** A number out
of 100 invites optimising the number, and any weighting behind it would be invented.
Nothing in the module can prevent a save; the UI says "none of them block
publishing." Checks: title length, description present/length/inherited,
`slugProblem`, off-site canonical, empty/thin body (<300 words), an `<h1>` in the
body, missing `<h2>` past 400 words, images without alt, share image, excerpt, tags,
noindex, nofollow.

`seo-editor.tsx` (~397 lines) renders three groups — Search appearance, Sharing,
Indexing — plus `google-search-preview.tsx`, `social-preview.tsx` and
`seo-checklist.tsx`. Robots are radio groups, not a `<select>`, so both consequences
are readable without opening anything. Placeholders show the *inherited* value.

Honesty properties that must survive any edit: the Google card carries an
**"Approximate"** pill and explains that Google truncates by pixel width and rewrites
most titles; overflow is CSS `line-clamp`, never a cut string; a draft shows **no
date** rather than an invented one; the card renders on `bg-white` because judging a
snippet against the wrong background is how authors end up writing for a result page
that does not exist.

---

## 9. In progress right now

**Lint comment fix — applied, not yet re-verified.** `eslint-disable-next-line` only
applies to the literal next line, and the reason text had wrapped onto a second
comment line, so the directive landed on the comment instead of the `<img>`. ESLint
reported both an "unused directive" and the underlying warning, twice over. Both sites
are now single-line **[verified by grep]**:

```
src/components/editor/image-dialog.tsx:170-171
src/lib/editor/extensions/figure-view.tsx:136-137
```

These were **comment-only** edits — no behaviour changed. **`npx next lint` has not
been re-run since**, because the run was interrupted. That is the first thing to do.

The other four `eslint-disable-next-line` sites were already correct and single-line:
`block-renderer.tsx:27`, `block-editor.tsx:149`, `blog/[slug]/page.tsx:94`,
`social-preview.tsx:110`.

---

## 10. Checks run, and their actual results

| Check | When | Result |
|---|---|---|
| `npx tsc --noEmit` | after the `TS1128` fix in `src/app/actions/posts.ts` | **PASS** — no output |
| `npx next lint --max-warnings=0` | before the comment fix | **4 warnings** (2 files × unused-directive + no-img-element) |
| `npx next lint` | after the comment fix | **NOT RUN** |
| `npm run build` | — | **NEVER RUN this session** |
| Sanitizer round-trip | ad-hoc script, since deleted | **8/8 PASS** (see §11) |
| Dev-server smoke test | — | **NEVER RUN** |
| Automated tests | — | **none exist; no test framework is installed** |

The `tsc` pass predates the two comment-only edits. Nothing else has changed since.

**Build status is genuinely unknown.** Do not claim otherwise.

---

## 11. Sanitizer round-trip — proven **[verified: run earlier this session]**

A temporary script transpiled `sanitize.ts` / `schema.ts` / `extract.ts` and asserted
the sanitize → `extractFontFamilies` contract. **8/8 passed.** The script has been
deleted; the conclusions are what matter:

| Input `style` | After sanitize | Extracted |
|---|---|---|
| `font-family: Inter` | `font-family:Inter` | `["Inter"]` |
| `font-family: "Playfair Display", serif` | `font-family:&quot;Playfair Display&quot;, serif` | `["Playfair Display"]` |
| `Lora, Georgia, serif` + `Inter`, two tags | both preserved | `["Inter","Lora"]` |
| `font-family: Space Grotesk; text-align: center` | both kept | `["Space Grotesk"]` |
| `font-family: var(--font-evil)` | **declaration dropped** | `[]` |
| `font-family: url(https://evil.example/a.css)` | **declaration dropped** | `[]` |
| `font-family: Inter'); @import url(//evil)` | **declaration dropped** | `[]` |

Three things follow, and they are load-bearing:

1. sanitize-html emits `&quot;` for quoted families — the `&quot;` alternative in the
   extractor's regex is **not** dead code.
2. It strips the space after the colon.
3. `var()`, `url()` and quote-breakout payloads have the **entire declaration**
   removed. CSS injection is closed at the sanitizer, not merely at the extractor.

If you touch `ALLOWED_STYLES` in `schema.ts` or the extractor regex, re-prove all
eight rows.

---

## 12. NOT DONE — the public-page half ⚠️

This is the honest gap. The admin side writes all the new columns; almost nothing on
the public side reads them yet.

### 12.1 `src/app/blog/[slug]/page.tsx` is still the pre-upgrade file **[verified — read in full]**

It renders `<BlockRenderer blocks={post.blocks} />` and **never touches
`content_html`**. Consequence: *an article written in the new rich-text editor renders
as an empty body on the live site.* This is the single most important thing to fix.

Also missing from that file:

- no `post_slug_history` lookup ⇒ a renamed published article 404s instead of 301ing
- no `<ArticleFonts>` ⇒ custom/Google fonts in a body never load publicly
- no JSON-LD, no breadcrumbs, no author card, no related posts, no prev/next
- no per-article robots — `robots_index` / `robots_follow` are stored and ignored
- `og_title`, `og_description`, `twitter_title`, `twitter_description`,
  `canonical_url` are **stored but never read**; `generateMetadata` only uses
  `seo_title`, `seo_description`, `excerpt`, `cover_image` and builds the canonical
  by hand as `${SITE.url}/blog/${slug}` from the **flat** `SITE`
- it does not call `resolveSeo()`, so the editor preview and the shipped tags can
  drift apart

`src/components/blog/article-body.tsx` **exists** but is imported nowhere.

### 12.2 Files that do not exist yet **[verified by directory listing]**

```
src/lib/seo/metadata.ts                    src/lib/seo/jsonld.ts
src/components/seo/structured-data.tsx     (the whole src/components/seo/ dir)
src/app/blog/[slug]/opengraph-image.tsx
src/app/feed.xml/route.ts
```

So: **no JSON-LD at all** — no WebSite, Person, BlogPosting or BreadcrumbList. No RSS
feed. No per-article OG image (only the site-wide `src/app/opengraph-image.tsx`).

`revalidatePath("/feed.xml")` is already called from the actions, pointing at a route
that does not exist. Harmless, but it is a promissory note.

### 12.3 `src/app/sitemap.ts` **[verified]**

Correctly excludes drafts (`.eq("published", true)`) and uses the real
`updated_at` for articles. Two problems: the home and `/blog` entries use
`lastModified: new Date()`, i.e. **a fabricated timestamp on every request** — which
the spec explicitly forbids — and `robots_index = 'noindex'` articles are **not**
excluded.

### 12.4 `src/app/robots.ts` **[verified]**

Disallows `/admin` only. Should also disallow `/login` and `/api`.

### 12.5 `src/app/layout.tsx` **[verified]**

`openGraph.siteName` is `SITE.name` from `@/lib/utils`, which resolves to
`"Aman Krishna"`. The spec requires `og:site_name = "AmanKrishna.in"` — that is
`SITE.name` from `@/lib/site`. One-line fix, but check every other `SITE` usage in
that file when you make it; the two objects have different shapes.

### 12.6 Blog index

`src/app/blog/page.tsx` **[unverified — not read this pass]**. Tag filtering via
`searchParams` with a canonical back to `/blog` was specced; whether any of it exists
is unknown.

---

## 13. Known warnings, bugs and open questions

### Warnings

- **Workspace-root warning** **[verified: reported by `next lint`]** — Next infers the
  workspace root as `C:\Users\Aman Krishna` because a stray
  `C:\Users\Aman Krishna\package-lock.json` sits above the repo's own lockfile.
  Fix with `outputFileTracingRoot` in `next.config.ts`, or delete the stray lockfile
  if it is genuinely junk (**ask first** — it is outside the repo).
- **`next lint` is deprecated** in Next 15.5. `npm run lint` already calls `eslint`
  directly; prefer that. `npx next lint` still works and is what produced the counts
  in §10.
- **`npm audit`: 6 pre-existing high-severity advisories** (brace-expansion, js-yaml,
  nanoid, next) **[from session]**. All predate this work. A Next 15.5.25 patch bump
  would address the `next` one — **not** done, and it is a dependency change, so it
  needs the user's go-ahead.
- Line endings: git warns `LF will be replaced by CRLF` on the modified files. Cosmetic
  on Windows; no `.gitattributes` was added.

### Bugs / gaps

1. **New-editor articles render empty publicly** (§12.1). Highest severity.
2. **Renamed published slugs 404** — history rows written, never read (§8.3).
3. **`og:site_name` is `"Aman Krishna"`, not `"AmanKrishna.in"`** (§12.5).
4. **Sitemap fakes `lastmod`** for `/` and `/blog`, and includes `noindex` articles
   (§12.3).
5. **Per-article robots directives are stored and ignored** (§12.1).
6. **Fonts never load on the public page** (§8.6 / §12.1).

### Open questions **[unverified]**

- Has `20260903_editor_seo_fonts.sql` been applied to any database? Assume no.
- Does the `article-images` storage bucket exist? It is created by that same migration.
- Does `.env.example` document `NEXT_PUBLIC_SITE_URL`, `GOOGLE_FONTS_API_KEY`,
  `NEXT_PUBLIC_FONT_CSS_ORIGIN`?
- Does `README.md` need the same additions?
- Does `src/components/ui/brand-icons.tsx` already export a LinkedIn glyph, or only
  GitHub? Read it before writing a new SVG.

---

## 14. Binding constraints — do not violate these

From the user's original spec. These are not suggestions.

1. **`https://AmanKrishna.in` is the only public domain.** Never let a `*.vercel.app`
   host reach canonical URLs, OG tags, sitemap entries, JSON-LD, RSS links or previews.
   `src/lib/site.ts` must not read `VERCEL_URL`.
2. **Do not break existing blog posts.** `blocks` stays; `resolveBodyHtml` is the
   bridge; no automatic content rewrite or destruction.
3. **No mock functionality.** Everything must actually work and persist.
4. **Rich text is untrusted input.** Prevent XSS, script injection, unsafe iframes,
   arbitrary CSS injection, `javascript:` URLs, malicious font URLs. Never render
   arbitrary HTML unsanitized.
5. **No `any` to silence TypeScript.** Cast to a concrete shape (repo convention,
   because the Supabase client is untyped).
6. **No fake SEO scores. No fake structured-data values. No fake `lastmod`.** The
   Google preview must stay labelled approximate.
7. **Sitemap excludes** drafts, admin pages, private pages, editor URLs, auth pages.
8. **Do not invent social profiles.** LinkedIn + GitHub only, via `AUTHOR_SAME_AS`.
9. **Character guidance, never truncation**, on every SEO field.
10. **Do not rewrite working parts** or add dependencies without clear benefit.
    Preserve the existing visual identity and design system (`glass`, `g-border`,
    `g-text`, `eyebrow`; tokens `fg`/`muted`/`ink`/`ink-2`/`line`/`surface`/`violet`/
    `cyan`/`blue`).
11. **Modular architecture** — editor state, UI, persistence, rendering, SEO
    generation, font loading and sanitization stay in separate modules.

### Environment gotchas that cost time before

- **Never type a backslash escape inside a Bash heredoc destined for JS** — even a
  quoted `<<'EOF'`. The transport can collapse it. Use `Write`/`Edit`, or
  `String.fromCharCode(92)`.
- Temporary scripts must live **inside** the repo, or Node cannot resolve
  `node_modules`.
- Windows 11 + Git Bash, Node v24.18.0.

---

# NEXT SESSION — START HERE

> **Steps 1, 4, 5, 9 and 11 below are DONE**, along with the OG-image half of
> 6–7, the local half of 8, and the security half of 10. Read the CURRENT STATE
> block at the top of this file first. What is genuinely left is only what needs
> credentials, and it is all one blocker:
>
> **Create `.env.local` with the two Supabase keys** (`cp .env.example .env.local`),
> then work step 2 → step 3 → the live half of 6–7 → the responsive/keyboard half
> of step 10. `docs/UPGRADE-REPORT.md` §11–§12 are written as runnable checklists
> for exactly that. Nothing else is outstanding.
>
> The instructions below are the original plan, kept for context.

Nothing is committed. Do not commit, push, install dependencies, or restart the
project. Work through this in order.

### 1. Finish the lint / `<img>` warning cleanup

The two wrapped `eslint-disable-next-line` comments are already collapsed onto one
line in `image-dialog.tsx:170` and `figure-view.tsx:136`. Confirm it:

```bash
npm run lint
```

Expect zero warnings. If four reappear, the directive is still not on the line
immediately above its `<img>`. Then decide on `outputFileTracingRoot` in
`next.config.ts` for the workspace-root warning (§13).

### 2. Apply the migration, then verify save + autosave for real

Run `supabase/migrations/20260903_editor_seo_fonts.sql` (SQL editor or
`supabase db push`) — **assume it has never been applied.** Confirm the
`article-images` bucket exists afterwards.

Then `npm run dev` and, on a real row:

- create an article → confirm it navigates to `/admin/articles/<id>` and that a
  second Save **updates** rather than inserting a duplicate
- edit a draft → badge goes Unsaved → Saving → Saved; check the row in Supabase
- open the same draft in two tabs, save in tab A, type in tab B → tab B must report
  **stale**, not overwrite
- open a **published** article → autosave must be off, with the reason shown
- confirm `posts.fonts` is populated server-side from the sanitised HTML
- confirm the `posts_touch` trigger actually bumps `updated_at` (if it does not,
  every autosave after the first reports stale)

### 3. Verify the font library end to end

Add a Google family and a custom-URL family in the font manager; apply both in a
body; save; confirm `posts.fonts` matches. Then confirm they load on the **public**
page — they will not, until step 4 wires `<ArticleFonts>`. Check
`GOOGLE_FONTS_API_KEY` is set, and that the catalog proxy returns results without it
leaking to the client.

### 4. Existing-article compatibility, and the public renderer 🔴 biggest item

`src/app/blog/[slug]/page.tsx` is still the pre-upgrade file. Rewrite it to:

- render `resolveBodyHtml(post)` through `src/components/blog/article-body.tsx`
  (which already exists, unused) — sanitize again at render, and keep
  `BlockRenderer` reachable so **legacy `blocks`-only articles keep rendering
  identically**
- resolve `post_slug_history` and issue a **301** for an old slug
- mount `<ArticleFonts>` from `getFontsForFamilies(post.fonts)`
- add semantic `<article>`, breadcrumbs, author card (reuse
  `src/components/ui/brand-icons.tsx`; `lucide-react@1.25` has **no** `Linkedin`
  export), related posts, prev/next
- honour `robots_index` / `robots_follow` per article

Test with one legacy article and one new rich-text article, side by side, before and
after.

### 5. Finish the SEO layer

Create `src/lib/seo/metadata.ts` so `generateMetadata` consumes **`resolveSeo()` from
`src/lib/seo/fields.ts`** — the whole point of that module is that the editor preview
and the shipped tag cannot disagree. Wire `canonical_url`, `og_title`,
`og_description`, `twitter_title`, `twitter_description`, which are currently stored
and ignored.

### 6–7. Verify the previews against reality

With §5 done, compare the Google Search preview and the OG/social preview in the
editor against the actual rendered `<head>` and against Facebook's Sharing Debugger /
LinkedIn Post Inspector. Keep the "Approximate" pill. Then add
`src/app/blog/[slug]/opengraph-image.tsx` (1200×630, `#050505` + violet/cyan) as the
fallback share image.

### 8. Confirm canonical URLs

`curl -s https://…/blog/<slug> | grep -i canonical` locally and on a preview
deployment. **No `*.vercel.app` may appear anywhere** in `<head>`, the sitemap, JSON-LD
or the feed. Also fix `og:site_name` → `"AmanKrishna.in"` in `src/app/layout.tsx`
(§12.5).

### 9. Sitemap, robots, JSON-LD

- `sitemap.ts`: drop the fabricated `new Date()` for `/` and `/blog`; exclude
  `robots_index = 'noindex'`
- `robots.ts`: also disallow `/login` and `/api`
- create `src/lib/seo/jsonld.ts` + `src/components/seo/structured-data.tsx` with
  **WebSite, Person** (`sameAs` from `AUTHOR_SAME_AS` — nothing invented),
  **BlogPosting**, **BreadcrumbList**; validate in Google's Rich Results Test. No
  placeholder values just to satisfy a validator.
- create `src/app/feed.xml/route.ts` — the actions already `revalidatePath("/feed.xml")`

### 10. Responsive, security and performance passes

Toolbar and dialogs at 375 px; keyboard-only path through the editor; focus rings and
`aria-pressed` states. Paste `<script>`, `<iframe>`, `javascript:` hrefs,
`onerror=` attributes, `font-family: url(...)` and a quote-breakout payload into the
editor, save, and confirm the **stored** row is clean. Re-prove the eight sanitizer
rows in §11 if `schema.ts` changed. Check CLS from late-loading fonts.

### 11. Final gate

```bash
npm run typecheck && npm run lint && npm run build
```

`npm run build` has **never been run** on this work. Expect to fix things. Then update
`.env.example` and `README.md` with `NEXT_PUBLIC_SITE_URL`, `GOOGLE_FONTS_API_KEY`,
`NEXT_PUBLIC_FONT_CSS_ORIGIN`, and write the final deliverable report (summary, files
created/modified, deps, schema changes, migration steps, env vars, Google Fonts
config, SEO improvements, security notes, limitations, how to test the editor, how to
test Google/OG metadata, manual deployment steps).

---

*Written from the repository state on 2026-09-04. Where this file and the code
disagree, the code is right — fix this file.*











