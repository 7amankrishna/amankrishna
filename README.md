# Aman Krishna — Portfolio

A premium, dark-themed developer portfolio built with Next.js 15, React 19,
TypeScript, Tailwind CSS 4, Framer Motion, React Three Fiber, and Supabase.

**Live sections:** animated 3D hero · about · skills · projects · journey
timeline · live GitHub stats · LinkedIn · contact form (Supabase) · blog with
drag-and-drop article editor · admin dashboard (Supabase Auth, owner-only).

## Blog & article editor

Articles are written in a drag-and-drop block editor at `/admin/articles`
(paragraph, heading, image, code, quote, list, divider blocks — drag the grip
to reorder). Each article has:

- **Permalink & slug** — auto-derived from the title, editable, validated
  (`lowercase-with-dashes`), shown as a live permalink preview
- **SEO** — SEO title, meta description, cover image, plus a Google-style
  result preview; published articles emit canonical URLs, Open Graph and
  Twitter cards via `generateMetadata`, and are added to `sitemap.xml`
- **Draft/published** state — only published articles appear at `/blog/[slug]`

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
4. Deploy. Update `SITE.url` in [`src/lib/utils.ts`](src/lib/utils.ts) to your
   production domain so metadata, sitemap, and OG images use it.

Vercel Analytics is already wired via `@vercel/analytics` — it activates
automatically once deployed.

## Project structure

```
src/
  app/
    layout.tsx            # fonts, SEO metadata, providers
    page.tsx              # home page (server component, fetches GitHub)
    not-found.tsx         # custom 404
    opengraph-image.tsx   # generated OG card
    sitemap.ts robots.ts manifest.ts
    actions/contact.ts    # server action → Supabase insert
    admin/  login/        # auth-protected dashboard
  components/
    hero/                 # 3D particle scene, typewriter, hero
    sections/             # about, skills, projects, experience, github, …
    chrome/               # navbar, command palette, cursor, loader, back-to-top
    ui/                   # section reveal, magnetic button, tilt card, brand icons
    admin/                # dashboard UI
  lib/
    utils.ts              # cn() + SITE constants (name, links, email)
    github.ts             # GitHub API fetch (ISR, 1h revalidate)
    supabase/             # browser + server clients
supabase/schema.sql       # tables, RLS policies, seed data
```

## Customizing

- **Identity & links** — edit `SITE` in `src/lib/utils.ts` (one place).
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

| Command         | What it does              |
| --------------- | ------------------------- |
| `npm run dev`   | Dev server (Turbopack)    |
| `npm run build` | Production build          |
| `npm start`     | Serve the production build|
| `npm run lint`  | ESLint                    |
