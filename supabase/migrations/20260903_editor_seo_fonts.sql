-- ============================================================
-- 2026-09 — Rich-text editor, font library and extended SEO
--
-- Idempotent: safe to re-run. Nothing here drops or rewrites
-- existing article content — `blocks` stays exactly as it is so
-- articles authored with the old block editor keep rendering.
-- ============================================================

-- ------------------------------------------------------------
-- posts: rich-text body + full SEO surface
-- ------------------------------------------------------------

-- Rich-text body as sanitized HTML (the format the public page renders)
-- and the TipTap document JSON (so the editor round-trips losslessly).
alter table public.posts add column if not exists content_html text;
alter table public.posts add column if not exists content_json jsonb;

-- Font families referenced by the body. Only these get a stylesheet on the
-- public article, so adding fonts to the library costs published pages nothing.
alter table public.posts add column if not exists fonts text[] not null default '{}';

-- SEO / social
alter table public.posts add column if not exists canonical_url text;
alter table public.posts add column if not exists og_title text;
alter table public.posts add column if not exists og_description text;
alter table public.posts add column if not exists og_image text;
alter table public.posts add column if not exists twitter_title text;
alter table public.posts add column if not exists twitter_description text;
alter table public.posts add column if not exists tags text[] not null default '{}';

-- Per-article robots directives. Kept as text (not boolean) so the value
-- read in metadata matches exactly what is emitted.
alter table public.posts add column if not exists robots_index text not null default 'index';
alter table public.posts add column if not exists robots_follow text not null default 'follow';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'posts_robots_index_check'
  ) then
    alter table public.posts
      add constraint posts_robots_index_check
      check (robots_index in ('index', 'noindex'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'posts_robots_follow_check'
  ) then
    alter table public.posts
      add constraint posts_robots_follow_check
      check (robots_follow in ('follow', 'nofollow'));
  end if;
end $$;

-- Blog index and sitemap both order published posts by date.
create index if not exists posts_published_at_idx
  on public.posts (published_at desc nulls last)
  where published;

-- Tag filtering on the blog index.
create index if not exists posts_tags_idx on public.posts using gin (tags);

-- ------------------------------------------------------------
-- post_slug_history: keep old URLs alive
--
-- Renaming a published article breaks every inbound link and every
-- indexed result pointing at the old path. Recording the old slug lets
-- /blog/<old-slug> answer with a 301 to the current one instead of a 404,
-- which is what search engines need in order to move the ranking across.
--
-- Only *published* renames are recorded — a draft has no public URL to
-- preserve, so filling this table from draft edits would just create
-- redirects for paths that were never reachable.
-- ------------------------------------------------------------
create table if not exists public.post_slug_history (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists post_slug_history_post_id_idx
  on public.post_slug_history (post_id);

alter table public.post_slug_history enable row level security;

-- Public read: resolving a redirect happens on an anonymous page request.
drop policy if exists "slug history is public" on public.post_slug_history;
create policy "slug history is public"
  on public.post_slug_history for select
  to anon, authenticated
  using (true);

drop policy if exists "only the admin writes slug history" on public.post_slug_history;
create policy "only the admin writes slug history"
  on public.post_slug_history for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- site_fonts: the font library backing the editor's font picker
--
-- `source` distinguishes Google-hosted families from custom @font-face
-- URLs so the loader knows which stylesheet strategy to use.
-- ------------------------------------------------------------
create table if not exists public.site_fonts (
  id uuid primary key default gen_random_uuid(),
  -- CSS family name, e.g. "Inter" or "Satoshi"
  family text not null unique check (char_length(family) between 1 and 100),
  source text not null check (source in ('google', 'custom')),
  -- Google: weights to request. Custom: the single weight of the file.
  weights int[] not null default '{400,700}',
  -- 'normal' | 'italic' (custom fonts only; Google handles both via the API)
  style text not null default 'normal' check (style in ('normal', 'italic')),
  -- Custom fonts only: absolute https URL of the font file or stylesheet.
  url text,
  -- CSS fallback stack appended after the family.
  fallback text not null default 'sans-serif',
  created_at timestamptz not null default now(),
  -- A custom font is meaningless without a URL; a Google font must not have one.
  constraint site_fonts_url_matches_source check (
    (source = 'custom' and url is not null) or
    (source = 'google' and url is null)
  )
);

alter table public.site_fonts enable row level security;

-- Public read: the published article page needs to resolve @font-face rules
-- for whatever fonts its body references.
drop policy if exists "fonts are public" on public.site_fonts;
create policy "fonts are public"
  on public.site_fonts for select
  to anon, authenticated
  using (true);

drop policy if exists "only the admin manages fonts" on public.site_fonts;
create policy "only the admin manages fonts"
  on public.site_fonts for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- Storage bucket for images dropped/uploaded into the editor.
--
-- Public read (they are published in articles), admin-only write. The
-- same is_admin() check that guards posts guards uploads, so a signed-in
-- non-admin cannot use the bucket as free hosting.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('article-images', 'article-images', true)
on conflict (id) do nothing;

drop policy if exists "article images are public" on storage.objects;
create policy "article images are public"
  on storage.objects for select
  using (bucket_id = 'article-images');

drop policy if exists "admin uploads article images" on storage.objects;
create policy "admin uploads article images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'article-images' and public.is_admin());

drop policy if exists "admin updates article images" on storage.objects;
create policy "admin updates article images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'article-images' and public.is_admin())
  with check (bucket_id = 'article-images' and public.is_admin());

drop policy if exists "admin deletes article images" on storage.objects;
create policy "admin deletes article images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'article-images' and public.is_admin());
