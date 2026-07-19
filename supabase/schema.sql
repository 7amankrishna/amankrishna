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
create policy "anyone can submit a message"
  on public.contact_messages for insert
  to anon, authenticated
  with check (true);

-- …but only authenticated users (you, the admin) can read them.
create policy "admins can read messages"
  on public.contact_messages for select
  to authenticated
  using (true);

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

create policy "published projects are public"
  on public.projects for select
  to anon, authenticated
  using (published = true);

create policy "admins manage projects"
  on public.projects for all
  to authenticated
  using (true)
  with check (true);

-- ------------------------------------------------------------
-- Blog-ready: posts table for future articles
-- ------------------------------------------------------------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  content text,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.posts enable row level security;

create policy "published posts are public"
  on public.posts for select
  to anon, authenticated
  using (published = true);

create policy "admins manage posts"
  on public.posts for all
  to authenticated
  using (true)
  with check (true);

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
