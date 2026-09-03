# Blog, editor and SEO upgrade — deliverable report

**Repo:** `7amankrishna/amankrishna` · **Branch:** `main` · **Written:** 2026-09-04
**Canonical domain:** `https://AmanKrishna.in` — the only public origin. No
`*.vercel.app` host appears in any canonical link, Open Graph tag, sitemap entry,
JSON-LD node or feed item.

**Nothing here is committed.** The working tree holds 20 modified tracked files
(+3189 / −355) and 53 untracked files. Review, then commit deliberately.

---

## 1. Summary

The repository already had a rich-text article editor with SEO fields, autosave
and a font library, all writing to Supabase. What it did **not** have was a
public side that read any of it. Concretely, before this work:

- an article written in the new rich-text editor rendered as an **empty page**,
  because `blog/[slug]/page.tsx` only ever drew `post.blocks`
- renaming a published article **404'd** the old URL — history rows were being
  written and never read
- `og_title`, `og_description`, `twitter_*`, `canonical_url`, `robots_index` and
  `robots_follow` were stored and **ignored**
- custom and Google fonts never loaded on a published page
- there was no structured data, no RSS feed, no per-article share image
- `sitemap.xml` invented a `lastmod` timestamp on every request, and listed
  `noindex` articles
- `og:site_name` resolved to `"Aman Krishna"` instead of `"AmanKrishna.in"`

This pass built the public half and closed the loop end to end:

- `/blog/[slug]` renders real bodies, honours per-article robots, resolves a
  retired slug with a **308**, loads only the fonts that article references, and
  emits a complete JSON-LD `@graph` with a real word count and reading time.
- Legacy `blocks`-only articles still render through `BlockRenderer` — not
  merely "non-empty", but **identical** to before.
- `/blog` gained tag filtering whose canonical always points back at bare
  `/blog`.
- `sitemap.xml`, `robots.txt` and a new `feed.xml` agree with each other and
  contain no fabricated values.
- A zero-dependency test harness proves the sanitizer and SEO invariants:
  **74 assertions, no new packages**.

---

## 2. Status against the planned work

| # | Item | Status |
|---|---|---|
| 1 | Lint / `<img>` directive cleanup, workspace-root warning | **Done** |
| 2 | Migration applied; live save + autosave verification | Migration applied and verified by you. **Live run blocked** — no `.env.local` |
| 3 | Font library end to end | **Blocked** — needs Supabase + `GOOGLE_FONTS_API_KEY` |
| 4 | Public renderer + legacy article compatibility | **Done** |
| 5 | SEO layer — `resolveSeo()` feeding `generateMetadata` | **Done** |
| 6–7 | Preview-vs-reality check; per-article OG image | OG image **done**; live preview comparison **blocked** |
| 8 | Canonical URL confirmation | **Done locally**; preview-deployment half blocked |
| 9 | Sitemap, robots, JSON-LD, RSS feed | **Done** |
| 10 | Responsive, security and performance passes | Security **done and automated**; responsive/keyboard audited **statically only** |
| 11 | Final gate, `.env.example`, `README.md`, this report | **Done** |

Everything marked blocked is blocked on one thing: there is no `.env.local` in
the repo, so `supabaseConfigured()` is false and no article data exists locally.
See §10.

---

## 3. Files

### Created — public SEO surface

```
src/lib/seo/metadata.ts                  resolveArticleSeo, articleMetadata,
                                         articleCanonical, articleShareImage
src/lib/seo/jsonld.ts                    Person/WebSite/Blog/BlogPosting/
                                         BreadcrumbList + serializeJsonLd
src/components/seo/structured-data.tsx   the <script type="application/ld+json"> tag
src/app/blog/[slug]/opengraph-image.tsx  per-article 1200×630 share card
src/app/feed.xml/route.ts                RSS 2.0 with <content:encoded>
```

### Created — test harness (no dependencies)

```
checks/alias.mjs              maps the `@/` tsconfig alias for Node
checks/register.mjs           registers the resolve hook
checks/sanitize.check.mjs     49 assertions against the real sanitizer
checks/seo.check.mjs          25 assertions against the real SEO/JSON-LD code
```

### Rewritten

```
src/app/blog/[slug]/page.tsx   was the pre-upgrade file; now the real renderer
src/app/blog/page.tsx          tag filtering, canonical, Blog JSON-LD
src/app/sitemap.ts             no fabricated lastmod; excludes noindex
src/app/robots.ts              also disallows /login and /api
next.config.ts                 outputFileTracingRoot pins the workspace root
.env.example                   documents every variable that is actually read
```

### Edited

```
src/app/layout.tsx           og:site_name → "AmanKrishna.in"; RSS alternate;
                             lang from the canonical SITE
src/app/page.tsx             self-referencing canonical + feed link
src/app/opengraph-image.tsx  dropped `runtime = "edge"` so it prerenders
package.json                 added the `check` script
README.md                    blog/editor section, env table, structure, scripts
CLAUDE.md                    rewritten as an accurate handoff
```

Earlier in the same effort (already in the working tree): `src/lib/site.ts`,
`src/lib/seo/{fields,checklist}.ts`, `src/lib/content/*` (6 files),
`src/lib/fonts/*` (6), `src/lib/editor/*` (7), `src/components/editor/*` (16),
`src/components/fonts/article-fonts.tsx`,
`src/components/blog/article-body.tsx`, `src/app/actions/fonts.ts`,
`src/app/api/fonts/google/route.ts`, plus the modified
`src/app/actions/posts.ts`, `src/components/admin/article-form.tsx`,
`src/lib/{posts,utils,admin}.ts`, `src/app/globals.css` and the two admin
article pages.

Full inventory: `git status --short` and `git diff --stat`.

---

## 4. Dependencies

**None were added in this pass.** The `check` script runs on Node's native
TypeScript type-stripping plus a 15-line module `resolve` hook, specifically so
that testing the security-critical code costs no new packages.

Already present from the editor work, all exact-pinned: `@tiptap/*` ×15 at
`3.31.0` (keep them in lockstep — a mixed ProseMirror tree fails at runtime, not
at compile time), `sanitize-html@2.17.7`, `@types/sanitize-html@2.16.0`.

---

## 5. Schema changes and migration

`supabase/migrations/20260903_editor_seo_fonts.sql` — **already applied and
manually verified.** Do not re-run it during normal work; it is idempotent
(`add column if not exists`, `drop policy if exists` before each `create
policy`) so a re-run is safe, but there is no reason to.

What it established:

- **`posts`** — `content_html`, `content_json`, `fonts text[]`, `canonical_url`,
  `og_title`, `og_description`, `og_image`, `twitter_title`,
  `twitter_description`, `tags text[]`, `robots_index`, `robots_follow`; check
  constraints on both robots columns; a partial index on `published_at where
  published`; a GIN index on `tags`. **`blocks` is untouched** — that is what
  keeps legacy articles alive.
- **`post_slug_history`** — `slug` primary key, `post_id` cascading to `posts`.
  RLS: public `select` (an anonymous request has to be able to resolve the
  redirect), admin-only write via `public.is_admin()`.
- **`site_fonts`** — `family` unique, `source in ('google','custom')`, `weights`,
  `style`, `url`, `fallback`, plus a constraint that custom requires a URL and
  google forbids one. RLS: public read, admin-only write.
- **Storage** — public bucket `article-images` with four `storage.objects`
  policies: public read; insert/update/delete gated on `public.is_admin()`.

It assumes `public.posts`, `public.is_admin()` and the `posts_touch` BEFORE
UPDATE trigger already exist from `supabase/schema.sql`. **Autosave's
compare-and-swap depends on that trigger bumping `updated_at`** — if it ever
stops firing, every autosave after the first reports `stale`.

For a fresh environment: run `supabase/schema.sql` first, then this migration.

---

## 6. Environment variables

Only the two Supabase keys are required. Full annotated list in `.env.example`.

| Variable | Required | Read by | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | `src/lib/supabase/{server,client}.ts` | project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | same | anon key |
| `NEXT_PUBLIC_SITE_URL` | no | `src/lib/site.ts` | overrides the canonical origin; defaults to `https://amankrishna.in` |
| `GOOGLE_FONTS_API_KEY` | no | `src/app/api/fonts/google/route.ts` | live Google Fonts catalog in the editor |
| `NEXT_PUBLIC_FONT_CSS_ORIGIN` | no | `src/lib/fonts/css.ts` | origin the `@font-face` CSS is fetched from |

**`NEXT_PUBLIC_SITE_URL` should normally stay unset.** `src/lib/site.ts`
deliberately does **not** read `VERCEL_URL`: a preview deployment must never
publish links to its own `*.vercel.app` host. Set it only if the domain moves.

`GITHUB_TOKEN` used to be listed in `.env.example` and has been removed —
`src/lib/github.ts` sends no `Authorization` header, so the variable had no
effect. Advertising it implied a capability that does not exist.

---

## 7. Google Fonts configuration

1. Google Cloud console → enable the **Web Fonts Developer API** → create an API
   key → set `GOOGLE_FONTS_API_KEY` in `.env.local` and in Vercel.
2. The key is read **only** by `src/app/api/fonts/google/route.ts`, a server
   route. It is never exposed to the browser — the font manager calls that
   route, not Google.
3. Without the key the picker falls back to the bundled catalog in
   `src/lib/fonts/catalog.ts`. Published articles keep rendering either way,
   because each article stores the families it actually uses.

How a font reaches a published page:

```
editor applies font-family via inline style
  → savePost sanitizes the HTML
  → extractFontFamilies(sanitized) recomputes posts.fonts server-side
  → getFontsForFamilies(post.fonts) loads only those rows from site_fonts
  → <ArticleFonts> emits the Google <link> and/or @font-face
```

Two consequences worth keeping: **adding a font to the library costs published
pages nothing**, and the client cannot decide which fonts a public page loads —
`rich-text-editor.tsx` deliberately no longer posts a `fonts` field, because the
server recomputes it from sanitized HTML.

`NEXT_PUBLIC_FONT_CSS_ORIGIN` lets you point `@font-face` CSS at a privacy
mirror (e.g. bunny.net) without touching any other code.

---

## 8. SEO improvements

### One resolution chain, shared by preview and shipped tag

`src/lib/seo/fields.ts` holds the only fallback chain:

```
title              = seo_title || title
description        = seo_description || excerpt || summarize(bodyHtml, 155)
ogTitle            = og_title || title
ogDescription      = og_description || description
twitterTitle       = twitter_title || ogTitle
twitterDescription = twitter_description || ogDescription
```

`src/lib/seo/metadata.ts` wraps it as `articleMetadata(post)`, which is what
`generateMetadata` returns, and the editor's Google/social previews call the same
resolver. **The card an author reviews and the tag that ships cannot disagree**,
because there is one implementation.

### Nothing is invented

This was the hardest constraint to honour, because a validator is easy to satisfy
dishonestly. The rules the code follows:

- A missing `datePublished` is **omitted**, never back-filled with "now".
- An article with no share image gets **no `image` property** — not the
  site-wide card dressed up as the article's own illustration.
- `wordCount` and `timeRequired` come from `statsFromHtml(bodyHtml)`, the same
  function the editor footer uses, so "8 min read" on the page and in the markup
  cannot diverge. Both are omitted for an empty body.
- `sameAs` is exactly `AUTHOR_SAME_AS` — LinkedIn and GitHub, both real.
- The sitemap's `/` entry has **no `lastModified` at all** rather than a
  fabricated one; `/blog` uses the newest real article `updated_at`.
- `feed.xml`'s `lastBuildDate` is the newest real `updated_at`, never "now".
- The editor's Google preview keeps its **"Approximate"** pill and clamps
  overflow with CSS, never by cutting the string. A draft shows no date.
- No SEO score anywhere. A number out of 100 invites optimising the number, and
  any weighting behind it would be made up. The checklist returns typed advisory
  items and nothing in it can block a save.

### Structured data

One `<script type="application/ld+json">` per page containing a single `@graph`,
with nodes cross-referenced by `@id` rather than repeated inline — so the Person
who authors an article is provably the same entity that publishes the site.

| Page | Nodes |
|---|---|
| `/blog/[slug]` | `WebSite`, `Person`, `BlogPosting`, `BreadcrumbList` |
| `/blog` | `WebSite`, `Person`, `Blog`, `BreadcrumbList` |

The visible breadcrumb trail on the article page is built from the **same array**
passed to `breadcrumbJsonLd()`, because Google requires the markup and the page
to agree.

### Indexing correctness

- **Canonicals are declared per page, never in `layout.tsx`.** A `canonical` in
  the root layout is inherited by every page that does not set one, so `/blog`
  would have claimed to be `/`.
- Setting `alternates` on a page **replaces** the layout's whole object, so the
  RSS `types` entry is repeated on the home page and the blog index. That is not
  duplication for its own sake — dropping it would silently remove the feed link.
- `/blog?tag=ai` canonicalises to bare `/blog` while still changing its
  `<title>`, so tag views cannot compete with the index in search.
- `robots_index` / `robots_follow` are honoured per article.
- Retired slugs 308-redirect (search-engine-equivalent to 301) to the current
  slug, re-checking that the target is still published — redirecting into a 404
  is worse than serving one.

### `noindex`, resolved consistently

One rule, applied everywhere: **excluded from machine distribution, kept for
human navigation.** A `noindex` article is absent from `sitemap.xml` and
`feed.xml`, but still listed on `/blog` and still reachable via prev/next and
related links. Anything else would either leak it to crawlers or strand it.

---

## 9. Security notes

### Sanitization — twice, on purpose

`sanitizeArticleHtml()` runs in the **save action** so the database never holds
hostile markup, and again in the **renderer** so pre-existing rows are safe too.
Neither is redundant: the first protects the store, the second protects against
rows written before the first existed.

Properties proven by `checks/sanitize.check.mjs` (49 assertions):

- `script`, `iframe`, `object`, `embed`, `form`, `style` and every `on*` handler
  are absent from the allow-list and therefore dropped; `nonTextTags` also drops
  the **text content** of `script`/`style`/`noscript`.
- `class` is permitted **only** on `<code>`, only matching
  `/^language-[\w+-]{1,20}$/`.
- An unsafe `href` or `src` degrades the element to a `<span>` — text kept, link
  or image lost. `javascript:` never survives.
- `target="_blank"` **forces** `rel="noopener noreferrer"`.
- `<input>` is rewritten to a `disabled` checkbox — task-list boxes must never be
  interactive on a published page.
- `data:` URIs are allowed for `<img>` only, so a pasted screenshot survives.
- CSS injection is closed **at the sanitizer**, not merely at the font
  extractor: `font-family: var(--x)`, `url(...)` and quote-breakout payloads have
  the **entire declaration** removed.

`src/lib/content/sanitize.ts` is **Node-only** — never import it into a client
component. `scrub-client.ts` (`scrubForPreview`) is the client mirror.

### JSON-LD injection

Article titles, descriptions and tags are author-controlled, and inside a
`<script>` element the HTML parser is still scanning for `</script`.
`JSON.stringify` emits that sequence verbatim, which would close the element
early and spill the rest of the document into the page as markup.
`serializeJsonLd()` escapes `<`, `>` and `&` to their six-character unicode
forms (`\u003c`, `\u003e`, `\u0026`) — legal JSON that parses to
an identical value. `checks/seo.check.mjs` asserts that
a hostile headline cannot close the element **and** that the payload still
`JSON.parse`s back to the original string.

### Access control

Admin is restricted to one account. The server guard in `src/lib/admin.ts`
redirects everyone else, and Supabase RLS enforces the same email check at the
database layer via `public.is_admin()` — so data stays protected even if the UI
guard were bypassed. To change the admin email, update **both**
`src/lib/admin.ts` and `supabase/schema.sql`.

`robots.txt` disallows `/admin`, `/login` and `/api`. That is a crawling hint,
**not** a security boundary; RLS and the server guard are the boundary.

---

## 10. Limitations — what is NOT verified

All of these share one cause: **there is no `.env.local` in the repo**, so
`supabaseConfigured()` returns false, no article rows exist locally, and the
admin guard redirects before the editor ever renders. None of it is a code
defect; none of it can be closed without your credentials.

| Not verified | Why | How to close it |
|---|---|---|
| Live save, autosave, stale-write refusal | needs a real `posts` row | §11 |
| Font library end to end | needs Supabase + `GOOGLE_FONTS_API_KEY` | §11 |
| Editor preview vs shipped `<head>` on a real article | needs a published article | §12 |
| Canonical check on a preview deployment | needs a deploy | §12 |
| Toolbar/dialogs at 375 px, keyboard traversal of the live editor | editor never renders | §11 |
| Rich Results Test, Sharing Debugger, Post Inspector | need a public URL | §12 |

What *was* verified statically for the responsive/keyboard pass, by reading the
code rather than a browser: the toolbar is `flex-wrap` with dividers hidden below
`sm` and labels collapsing to icons, so it reflows at 375 px rather than
overflowing; `globals.css:99` gives every focusable element a 2 px cyan
`:focus-visible` outline with 3 px offset; `ToolbarButton` carries `aria-label`
plus `aria-pressed`, and `ToolbarGroup` is a labelled `role="group"`; `Modal` has
a real focus trap (Escape, Tab cycling, focus restore, body scroll lock) and is
`items-start` with `overflow-y-auto` so a tall dialog scrolls instead of
clipping. The `outline: none` on `.prose-article.tiptap` is deliberate — a
persistent ring around the whole canvas while typing is noise, and selected nodes
still get the cyan ring.

Other known limitations:

- **`npm audit`: 6 pre-existing high-severity advisories** (brace-expansion,
  js-yaml, nanoid, next). All predate this work. A Next 15.5.25 patch bump would
  clear the `next` one — not done, because it is a dependency change.
- **No test framework.** `npm run check` is a hand-rolled harness covering the
  sanitizer and the SEO/JSON-LD layer only. The editor components, server actions
  and React behaviour have no automated coverage.
- **Legacy `blocks` articles are only proven identical by construction** — the
  renderer branches to `BlockRenderer` whenever `content_html` is empty and
  `blocks` is not. No before/after screenshot comparison was possible.
- `git` reports `LF will be replaced by CRLF` on the modified files. Cosmetic on
  Windows; no `.gitattributes` was added.

---

## 11. How to test the editor

```bash
cp .env.example .env.local    # fill in the two Supabase keys
npm run dev
```

Sign in at `/login` with the admin account, then go to `/admin/articles`.

**Save and duplicate-insert:** create an article → confirm the URL becomes
`/admin/articles/<id>` → press Save again → confirm it **updates** rather than
inserting a second row. (The old form stayed on `/new`, so a second Save created
a duplicate; `savePost` now returns `id` and the form does `router.replace`.)

**Autosave:** edit a draft and watch the badge go Unsaved → Saving → Saved, then
check the row in Supabase. Open the same draft in two tabs, save in tab A, type
in tab B — **tab B must report `stale`**, not overwrite. Open a *published*
article and confirm autosave is off with the reason shown.

**The trigger autosave depends on:** confirm `posts_touch` actually bumps
`updated_at`. If it does not fire, every autosave after the first reports stale,
because the compare-and-swap is `.eq("id", id).eq("updated_at", seen)`.

**Fonts:** add a Google family and a custom-URL family in the font manager, apply
both in a body, save, and confirm `posts.fonts` matches — it is recomputed
server-side from the sanitized HTML, so it should hold exactly the families the
body still references. Publish, then view the public page and confirm the
`<link>` / `@font-face` for those families and **only** those.

**Legacy compatibility:** open a pre-upgrade article that has `blocks` and no
`content_html`. Public page must render **identically** to before. Then open it
in the rich-text editor and save — it gains `content_html` and moves to the prose
renderer. Compare before/after.

**Slug history:** publish an article, rename its slug, then request the **old**
URL. Expect a 308 to the new one, not a 404.

**Sanitizer, against the stored row:** paste `<script>alert(1)</script>`, an
`<iframe>`, an `<a href="javascript:alert(1)">`, an `<img onerror=alert(1)>`,
`font-family: url(https://evil.example/a.css)` and a quote-breakout payload into
the body. Save. Inspect `posts.content_html` **in Supabase** — it must be clean
at rest, not merely clean on screen. `npm run check` asserts the same properties
against the sanitizer directly.

**Responsive and keyboard:** at 375 px confirm the toolbar wraps and every
dialog scrolls rather than clipping. Tab through the toolbar with no mouse —
every button should show the cyan focus ring and announce its label and pressed
state.

---

## 12. How to test Google / OG metadata

Locally, against a production build:

```bash
npm run build && npm start
curl -s http://localhost:3000/blog/<slug> | tr '>' '>\n' | grep -iE 'canonical|og:|twitter:|robots'
```

Check, in order:

1. `<link rel="canonical">` matches `canonical_url` when set, otherwise
   `https://amankrishna.in/blog/<slug>`.
2. `og:site_name` is **`AmanKrishna.in`** (not `Aman Krishna`).
3. `og:title` / `og:description` reflect the `og_*` overrides, and `twitter:*`
   falls back to the `og:*` values when unset.
4. `robots` reflects that article's `robots_index` / `robots_follow`.
5. **No `*.vercel.app` anywhere.** Also check `/sitemap.xml`, `/feed.xml`,
   `/robots.txt` and the JSON-LD block.
6. Compare all of the above against the Google and social previews in the editor.
   They should agree by construction — both call `resolveSeo()` — so any
   difference is a bug worth chasing.

Structured data: paste the page source into the
[Rich Results Test](https://search.google.com/test/rich-results) or the
[Schema Markup Validator](https://validator.schema.org/). Expect `WebSite`,
`Person`, `BlogPosting` and `BreadcrumbList` with no errors. A missing
`datePublished` or `image` on a given article is intended, not a defect.

Share cards, once deployed: [Facebook Sharing
Debugger](https://developers.facebook.com/tools/debug/),
[LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/), and
`/blog/<slug>/opengraph-image` directly in a browser.

Feed: `curl -s http://localhost:3000/feed.xml | head -40`. Confirm
`lastBuildDate` is a real article timestamp, `noindex` articles are absent, and
`<content:encoded>` holds sanitized HTML.

---

## 13. Manual deployment steps

1. **Commit.** Nothing in this work is committed yet.
2. **Supabase** — the migration is already applied to your project. For any *new*
   environment, run `supabase/schema.sql` then
   `supabase/migrations/20260903_editor_seo_fonts.sql`, and confirm the
   `article-images` bucket exists.
3. **Vercel env vars** — set `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` for Production, Preview and Development. Add
   `GOOGLE_FONTS_API_KEY` if you want the live font catalog. **Leave
   `NEXT_PUBLIC_SITE_URL` unset** unless the domain actually moves.
4. **Domain** — point `AmanKrishna.in` at the project and make it the production
   domain.
5. **Deploy**, then verify `/sitemap.xml`, `/robots.txt`, `/feed.xml`,
   `/opengraph-image` and one real article's `<head>` on the live domain.
6. **Search Console** — submit `https://amankrishna.in/sitemap.xml`, and use URL
   Inspection on one article to confirm Google sees the canonical you intended.

---

## 14. Verification actually run

| Gate | Command | Result |
|---|---|---|
| Types | `npx tsc --noEmit` | **PASS** — exit 0, no output |
| Lint | `npx eslint` | **PASS** — exit 0, no warnings |
| Unit checks | `npm run check` | **PASS** — 49 sanitizer + 25 SEO assertions |
| Build | `npx next build --turbopack` | **PASS** — exit 0, 13/13 static pages |

Run all four with:

```bash
npm run typecheck && npm run lint && npm run check && npm run build
```

Beyond the gates, the **shipped artifacts** were inspected rather than the source:
the prerendered `.next/server/app/{robots.txt,sitemap.xml,feed.xml}.body` files
were read directly, then `next start` served the build while 9 routes were
curled — `/` 200, `/blog` 200, `/blog?tag=ai` 200, `/blog/does-not-exist` 404,
`/feed.xml` 200, `/robots.txt` 200, `/sitemap.xml` 200, `/opengraph-image` 200,
`/admin` 200 (pre-existing graceful degradation without Supabase).

Head tags were extracted from both `/blog` and `/blog?tag=ai`. Both emit
`<link rel="canonical" href="https://amankrishna.in/blog"/>` and the same
`og:url`, while their titles differ (`Blog — Aman Krishna` vs
`Posts tagged "ai" — Aman Krishna`) — the tag-canonical requirement, proven on
real output rather than asserted from code. `og:site_name` was `AmanKrishna.in`,
the RSS alternate was present, and the JSON-LD graph contained `WebSite`,
`Person`, `Blog` and a two-step `BreadcrumbList` with `&` correctly escaped.

The `*.vercel.app` constraint holds. Four occurrences exist in the built HTML and
all four are the author's own project links — one hardcoded project href and
three `homepage` fields from the GitHub API. None appear in a canonical, `og:url`,
`og:image`, sitemap entry, robots directive, feed item or JSON-LD node.

---

## 15. Where to look next

`CLAUDE.md` carries the working handoff — architecture, conventions, binding
constraints and the environment gotchas that cost time. `README.md` is the
public-facing setup guide. This file is the record of what this upgrade changed
and what it did not prove.

