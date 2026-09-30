-- ============================================================
-- Portfolio schema — run in the Supabase SQL editor
-- ============================================================

-- Contact form submissions (public insert, owner-only read)
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 200),
  message text not null check (char_length(message) between 1 and 5000),
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

-- Anyone (anon) may submit a message…
drop policy if exists "anyone can submit a message" on public.contact_messages;
create policy "anyone can submit a message"
  on public.contact_messages for insert
  to anon, authenticated
  with check (true);

-- …but only the site admin can read them.
drop policy if exists "admins can read messages" on public.contact_messages;
create policy "admins can read messages"
  on public.contact_messages for select
  to authenticated
  using ((auth.jwt() ->> 'email') = '7amankrishna@gmail.com');

drop policy if exists "admins can delete messages" on public.contact_messages;
create policy "admins can delete messages"
  on public.contact_messages for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = '7amankrishna@gmail.com');

-- ------------------------------------------------------------
-- Dynamic projects (public read of published rows, admin write)
-- ------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  url text,
  repo text,
  tags text[] not null default '{}',
  gradient text not null default 'from-violet/30 via-blue/20 to-transparent',
  published boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;

drop policy if exists "published projects are public" on public.projects;
create policy "published projects are public"
  on public.projects for select
  to anon, authenticated
  using (published = true);

drop policy if exists "admins manage projects" on public.projects;
create policy "admins manage projects"
  on public.projects for all
  to authenticated
  using ((auth.jwt() ->> 'email') = '7amankrishna@gmail.com')
  with check ((auth.jwt() ->> 'email') = '7amankrishna@gmail.com');

-- ------------------------------------------------------------
-- Blog articles — block-based content with SEO fields.
-- Write access is restricted to THE admin (email check), not just
-- any authenticated user.
-- ------------------------------------------------------------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 200),
  excerpt text,
  -- ordered array of content blocks:
  -- [{ "id": "...", "type": "paragraph"|"heading"|"image"|"code"|"quote"|"list"|"divider", ... }]
  blocks jsonb not null default '[]',
  -- SEO
  seo_title text,
  seo_description text,
  cover_image text,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.posts enable row level security;

-- Migration for tables created by an older version of this schema:
-- bring posts up to the block-based shape if columns are missing.
alter table public.posts add column if not exists blocks jsonb not null default '[]';
alter table public.posts add column if not exists seo_title text;
alter table public.posts add column if not exists seo_description text;
alter table public.posts add column if not exists cover_image text;
alter table public.posts add column if not exists updated_at timestamptz not null default now();
alter table public.posts drop column if exists content;

-- Helper: is the current JWT the site admin?
create or replace function public.is_admin()
returns boolean
language sql stable
as $$
  select coalesce(auth.jwt() ->> 'email', '') = '7amankrishna@gmail.com'
$$;

drop policy if exists "published posts are public" on public.posts;
-- old v1 policy name — must go, it granted all authenticated users write access
drop policy if exists "admins manage posts" on public.posts;
create policy "published posts are public"
  on public.posts for select
  to anon, authenticated
  using (published = true or public.is_admin());

drop policy if exists "only the admin writes posts" on public.posts;
create policy "only the admin writes posts"
  on public.posts for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "only the admin updates posts" on public.posts;
create policy "only the admin updates posts"
  on public.posts for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "only the admin deletes posts" on public.posts;
create policy "only the admin deletes posts"
  on public.posts for delete
  to authenticated
  using (public.is_admin());

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists posts_touch on public.posts;
create trigger posts_touch before update on public.posts
  for each row execute function public.touch_updated_at();

-- Seed the two launch projects so the admin dashboard has data
insert into public.projects (title, description, url, tags, gradient, published, sort_order)
values
  ('Darajni',
   'An Indian fashion brand focused on premium ethnic and contemporary wear with a seamless e-commerce experience.',
   'https://www.darajni.in',
   array['E-commerce','Fashion','Production'],
   'from-violet/30 via-blue/20 to-transparent', true, 1),
  ('New Talent Library',
   'A modern platform showcasing talent and digital innovation with responsive UI and scalable architecture.',
   'https://newtalentlibrary.vercel.app/',
   array['Next.js','Platform','Responsive'],
   'from-cyan/30 via-blue/20 to-transparent', true, 2)
on conflict do nothing;
