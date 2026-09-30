# Aman Krishna — Portfolio

A premium, dark-themed developer portfolio built with Next.js 15, React 19,
TypeScript, Tailwind CSS 4, Framer Motion, React Three Fiber, and Supabase.

**Live sections:** animated 3D hero · about · skills · projects · journey
timeline · live GitHub stats · LinkedIn · contact form (Supabase) · blog with
drag-and-drop article editor · admin dashboard (Supabase Auth, owner-only).

## Blog & article editor

Articles are written in a rich-text editor at `/admin/articles` (TipTap —
headings, lists, tables, code blocks, images, callouts, per-selection font and
colour control). Articles written in the older drag-and-drop block editor keep
rendering exactly as they always did; opening one in the rich-text editor and
saving migrates it. Each article has:

- **Permalink & slug** — auto-derived from the title, editable, validated
  (`lowercase-with-dashes`), shown as a live permalink preview. Renaming a
  published article records the old slug, and the old URL 308-redirects to the
  new one instead of 404ing.
- **SEO** — SEO title, meta description, canonical URL, Open Graph and Twitter
  overrides, cover/share image, `noindex`/`nofollow` toggles and tags, with a
  Google-style result preview and social card previews. The previews and the
  shipped `<head>` are computed by the same `resolveSeo()` code, so they cannot
  disagree.
- **Structured data** — every article emits a single JSON-LD `@graph`
  (`WebSite`, `Person`, `BlogPosting`, `BreadcrumbList`) with a real word count
  and reading time. Nothing is invented: a missing date or image is omitted
  rather than back-filled.
- **Draft/published** state — only published articles appear at `/blog/[slug]`,
  in `sitemap.xml` and in `feed.xml`

Article bodies are sanitized twice — once in the save action so the database
never holds hostile markup, and again in the public renderer so pre-existing
rows are safe too.

Public surfaces: `/blog` (with `?tag=` filtering, canonical always pointing at
bare `/blog`), `/blog/[slug]`, `/sitemap.xml`, `/robots.txt` and `/feed.xml`
(RSS 2.0, full sanitized content). `noindex` articles are listed on `/blog` for
human navigation but excluded from the sitemap and the feed.

**Admin access is restricted to one account** (`7amankrishna@gmail.com`):
the server guard in `src/lib/admin.ts` redirects everyone else, and Supabase
RLS policies enforce the same email check at the database layer — so data is
protected even if the UI guard were bypassed. To change the admin email,
update it in both `src/lib/admin.ts` and `supabase/schema.sql`.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in Supabase keys (optional for dev)
npm run dev
```

Open http://localhost:3000. The site fully works without Supabase — the
contact form and admin dashboard degrade gracefully until keys are added.

## Environment variables

Only the two Supabase keys are required. See
[`.env.example`](.env.example) for the annotated list.

| Variable | Required | Purpose |
| -------- | -------- | ------- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase anon key |
| `NEXT_PUBLIC_SITE_URL` | no | Overrides the canonical public origin. Defaults to `https://amankrishna.in` |
| `GOOGLE_FONTS_API_KEY` | no | Enables the live Google Fonts picker in the editor |
| `NEXT_PUBLIC_FONT_CSS_ORIGIN` | no | Origin the `@font-face` CSS is fetched from. Defaults to `https://fonts.googleapis.com` |

**`NEXT_PUBLIC_SITE_URL` should normally stay unset.** Every canonical link,
Open Graph URL, sitemap entry, JSON-LD node and RSS link is built from
`SITE.url` in [`src/lib/site.ts`](src/lib/site.ts), and that value is
deliberately *not* derived from `VERCEL_URL` — a preview deployment must never
publish links to its own `*.vercel.app` host. Set this variable only if the site
genuinely moves domains.

Without `GOOGLE_FONTS_API_KEY` the font picker falls back to the bundled list.
Already-published articles keep rendering either way, because each article
stores the font families it actually uses.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run everything in [`supabase/schema.sql`](supabase/schema.sql).
   This creates `contact_messages`, `projects`, and `posts` with row-level
   security (public can submit messages / read published projects; only
   authenticated users can read messages or manage content).
3. In **Project Settings → API**, copy the URL and anon key into `.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. Create your admin user in **Authentication → Users → Add user**
   (email + password). Sign in at `/login`, then manage things at `/admin`.

## Deploy to Vercel

1. Push this repo to GitHub.
2. [vercel.com/new](https://vercel.com/new) → import the repo → framework is
   auto-detected as Next.js.
3. Add the two `NEXT_PUBLIC_SUPABASE_*` environment variables.
4. Deploy. The production domain lives in
   [`src/lib/site.ts`](src/lib/site.ts) — that one file is what metadata,
   canonicals, the sitemap, JSON-LD, the RSS feed and OG images all read.
   Do **not** point it at a `*.vercel.app` host.

Vercel Analytics is already wired via `@vercel/analytics` — it activates
automatically once deployed.

## Project structure

```
src/
  app/
    layout.tsx            # fonts, root SEO metadata, providers
    page.tsx              # home page (server component, fetches GitHub)
    not-found.tsx         # custom 404
    opengraph-image.tsx   # generated site-wide OG card
    sitemap.ts robots.ts manifest.ts
    feed.xml/route.ts     # RSS 2.0 feed
    blog/                 # index (?tag= filtering) + [slug] article page
                          #   [slug]/opengraph-image.tsx — per-article OG card
    actions/              # server actions (contact, posts)
    api/fonts/google/     # Google Fonts proxy for the editor picker
    admin/  login/        # auth-protected dashboard
  components/
    hero/                 # 3D particle scene, typewriter, hero
    sections/             # about, skills, projects, experience, github, …
    chrome/               # navbar, command palette, cursor, loader, back-to-top
    ui/                   # section reveal, magnetic button, tilt card, brand icons
    blog/                 # article-body (rich text) + block-renderer (legacy)
    editor/               # TipTap editor, toolbars, dialogs
    seo/                  # structured-data script tag
    admin/                # dashboard UI
  lib/
    site.ts               # SINGLE SOURCE OF TRUTH for domain + identity
    utils.ts              # cn() + flat person-centric view of site.ts
    posts.ts              # Post model, slugify, tag parsing
    seo/                  # resolveSeo fields, metadata builders, JSON-LD
    content/              # sanitize, schema allow-list, blocks→html, stats
    fonts/                # font query + @font-face CSS generation
    github.ts             # GitHub API fetch (ISR, 1h revalidate)
    supabase/             # browser + server clients
supabase/schema.sql       # tables, RLS policies, seed data
```

## Customizing

- **Identity & links** — edit `SITE` in [`src/lib/site.ts`](src/lib/site.ts).
  That is the single source of truth: `src/lib/utils.ts` exports a flat,
  person-centric *view* of it for the portfolio sections, and derives every
  value from it. Never hardcode the domain or a profile URL in a component.
- **Resume** — replace `public/resume.pdf` with your actual resume.
- **Projects** — edit `defaultProjects` in
  `src/components/sections/projects.tsx`, or insert rows into the Supabase
  `projects` table (the admin dashboard lists them).
- **Colors** — design tokens live in the `@theme` block of
  `src/app/globals.css` (`--color-violet`, `--color-cyan`, …).

## Performance notes

- The Three.js hero is code-split (`next/dynamic`, no SSR) and pauses its
  render loop when scrolled out of view.
- Aurora blobs use pre-blurred radial gradients instead of `filter: blur()`
  to stay cheap on integrated GPUs.
- All motion respects `prefers-reduced-motion`.
- GitHub data is fetched server-side with a 1-hour ISR revalidate.

## Scripts

| Command             | What it does                    |
| ------------------- | ------------------------------- |
| `npm run dev`       | Dev server (Turbopack)          |
| `npm run build`     | Production build (Turbopack)    |
| `npm start`         | Serve the production build      |
| `npm run lint`      | ESLint                          |
| `npm run typecheck` | `tsc --noEmit`                  |

Before pushing, run all three checks:

```bash
npm run typecheck && npm run lint && npm run build
```
