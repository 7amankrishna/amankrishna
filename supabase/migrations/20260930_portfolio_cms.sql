-- Editorial portfolio CMS foundation. Additive and safe to run on existing installs.
begin;
create table if not exists public.portfolio_settings (
  id boolean primary key default true check (id),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(), name text not null, category text not null default '', description text not null default '', icon text not null default '', sort_order int not null default 0, featured boolean not null default false, published boolean not null default true, state text not null default 'published' check (state in ('draft','published','archived')), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.journey_entries (
  id uuid primary key default gen_random_uuid(), label text not null default '', title text not null, description text not null default '', period text not null default '', image text not null default '', image_alt text not null default '', sort_order int not null default 0, published boolean not null default true, state text not null default 'published' check (state in ('draft','published','archived')), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.building_entries (
  id uuid primary key default gen_random_uuid(), title text not null, description text not null default '', sort_order int not null default 0, published boolean not null default true, state text not null default 'published' check (state in ('draft','published','archived')), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.projects add column if not exists slug text;
alter table public.projects add column if not exists category text not null default '';
alter table public.projects add column if not exists short_description text not null default '';
alter table public.projects add column if not exists media text not null default '';
alter table public.projects add column if not exists gallery jsonb not null default '[]';
alter table public.projects add column if not exists state text;
alter table public.projects add column if not exists featured boolean not null default false;
alter table public.projects add column if not exists content_html text not null default '';
alter table public.projects add column if not exists content_json jsonb;
alter table public.projects add column if not exists image_alt text not null default '';
alter table public.projects add column if not exists year text not null default '';
alter table public.projects add column if not exists status text not null default '';
alter table public.projects add column if not exists why_built text not null default '';
alter table public.projects add column if not exists features text not null default '';
alter table public.projects add column if not exists architecture text not null default '';
alter table public.projects add column if not exists challenges text not null default '';
alter table public.projects add column if not exists learnings text not null default '';
alter table public.projects add column if not exists seo_title text not null default '';
alter table public.projects add column if not exists seo_description text not null default '';
alter table public.projects add column if not exists updated_at timestamptz not null default now();
alter table public.contact_messages add column if not exists read_at timestamptz;
alter table public.contact_messages add column if not exists archived_at timestamptz;
alter table public.contact_messages add column if not exists subject text not null default '' check (char_length(subject) <= 200);

create unique index if not exists projects_slug_idx on public.projects(slug) where slug is not null;
create index if not exists portfolio_projects_public_idx on public.projects(published, state, sort_order);
update public.projects set state = case when published then 'published' else 'draft' end where state is null;
alter table public.projects alter column state set default 'draft';
alter table public.projects alter column state set not null;
-- Stable, collision-free backfill; preserve every existing row and authored slug.
update public.projects set slug = coalesce(nullif(trim(both '-' from regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g')), ''), 'project') || '-' || id::text where slug is null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'projects_state_check') then
    alter table public.projects add constraint projects_state_check check (state in ('draft','published','archived'));
  end if;
end $$;
drop policy if exists "published projects are public" on public.projects;
drop policy if exists "admins manage projects" on public.projects;

create table if not exists public.project_slug_history (
  slug text primary key, project_id uuid not null references public.projects(id) on delete cascade, created_at timestamptz not null default now()
);
alter table public.project_slug_history enable row level security;
drop policy if exists "published project redirects" on public.project_slug_history;
create policy "published project redirects" on public.project_slug_history for select to anon, authenticated using (exists (select 1 from public.projects where id = project_id and published and state = 'published'));
drop policy if exists "admin manages project redirects" on public.project_slug_history;
create policy "admin manages project redirects" on public.project_slug_history for all to authenticated using (public.is_admin()) with check (public.is_admin());
create or replace function public.portfolio_project_slug_history() returns trigger language plpgsql set search_path = public as $$
begin
  if new.slug is null or new.slug = '' then raise exception 'Project slug is required'; end if;
  if exists (select 1 from public.projects where slug = new.slug and id <> new.id)
     or exists (select 1 from public.project_slug_history where slug = new.slug and project_id <> new.id) then
    raise exception 'Project slug is already used by a current or historical project URL';
  end if;
  if old.slug is distinct from new.slug and old.published and old.state = 'published' then
    if exists (select 1 from public.projects where slug = old.slug and id <> old.id)
       or exists (select 1 from public.project_slug_history where slug = old.slug and project_id <> old.id) then
      raise exception 'Previous project slug is already reserved';
    end if;
    insert into public.project_slug_history(slug, project_id) values(old.slug, old.id) on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists portfolio_project_slug_history on public.projects;
create trigger portfolio_project_slug_history before update on public.projects for each row execute function public.portfolio_project_slug_history();

insert into storage.buckets (id, name, public) values ('portfolio-media', 'portfolio-media', true) on conflict (id) do nothing;
drop policy if exists "portfolio media are public" on storage.objects;
create policy "portfolio media are public" on storage.objects for select using (bucket_id = 'portfolio-media');
drop policy if exists "admin manages portfolio media" on storage.objects;
create policy "admin manages portfolio media" on storage.objects for all to authenticated using (bucket_id = 'portfolio-media' and public.is_admin()) with check (bucket_id = 'portfolio-media' and public.is_admin());

do $$ declare t text; begin
  foreach t in array array['portfolio_settings','skills','journey_entries','building_entries','projects'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "public published %s" on public.%I', t, t);
    execute format('create policy "public published %s" on public.%I for select to anon, authenticated using (%s)', t, t, case when t = 'portfolio_settings' then 'true' else '(published = true and state = ''published'')' end);
    execute format('drop policy if exists "admin manages %s" on public.%I', t, t);
    execute format('create policy "admin manages %s" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t, t);
    execute format('drop trigger if exists portfolio_touch on public.%I', t);
    execute format('create trigger portfolio_touch before update on public.%I for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;
alter table public.contact_messages enable row level security;
drop policy if exists "admins can update messages" on public.contact_messages;
create policy "admins can update messages" on public.contact_messages for update to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.portfolio_settings (id, data) values (true, $settings${
 "profile":{"name":"Aman Krishna","headline":"AI • Machine Learning • Full Stack Development • Problem Solver","bio":"AI, Machine Learning & Technology Enthusiast","avatar":"","avatarAlt":"Aman Krishna","resume":"","email":"7amankrishna@gmail.com","phone":"","location":"","githubUser":"7amankrishna"},
 "hero":{"eyebrow":"Portfolio — 2026","heading":"Aman Krishna","subtitle":"AI • Machine Learning • Full Stack Development • Problem Solver","description":"Building real-world products","primaryLabel":"View Projects","primaryUrl":"#projects","secondaryLabel":"Contact Me","secondaryUrl":"#contact","image":"","imageAlt":"","status":"","annotation":""},
 "about":{"heading":"Engineer in the making.","body":"I'm a Computer Science undergraduate who treats every idea as something to ship. My work sits at the intersection of artificial intelligence and modern web engineering — training intuition in ML fundamentals while building production-grade products with Next.js, TypeScript, and Supabase.","image":"","imageAlt":"","facts":[{"label":"Focus","value":"AI/ML"},{"label":"Development","value":"Full stack"},{"label":"Code","value":"Open source"}]},
 "philosophy":"Focused on building real-world products people actually use.","currentStatus":[],
 "socials":[{"label":"GitHub","url":"https://github.com/7amankrishna"},{"label":"LinkedIn","url":"https://www.linkedin.com/in/7amankrishna"}],
 "sections":[{"id":"hero","label":"Home","heading":"Aman Krishna","visible":true,"order":0},{"id":"about","label":"About","heading":"Engineer in the making.","visible":true,"order":1},{"id":"philosophy","label":"Philosophy","heading":"How I build","visible":true,"order":2},{"id":"skills","label":"Skills","heading":"Tools of the trade.","visible":true,"order":3},{"id":"projects","label":"Work","heading":"Things I've shipped.","visible":true,"order":4},{"id":"journey","label":"Journey","heading":"The path so far.","visible":true,"order":5},{"id":"github","label":"GitHub","heading":"Open source","visible":true,"order":6},{"id":"building","label":"Building","heading":"In the lab","visible":false,"order":7},{"id":"status","label":"Now","heading":"Currently","visible":false,"order":8},{"id":"contact","label":"Contact","heading":"Get in touch","visible":true,"order":9}],
 "appearance":{"theme":"dark","accent":"#C95B3F","motion":true,"show3d":true},
 "seo":{"title":"Aman Krishna — AI, ML & Full Stack Development","description":"Aman Krishna writes about Artificial Intelligence, Machine Learning, software engineering and emerging technology.","canonicalUrl":"https://amankrishna.in","ogImage":"","twitterImage":"","robotsIndex":"index","robotsFollow":"follow"}
}$settings$::jsonb) on conflict (id) do nothing;
-- Seed sources: original sections/projects.tsx, skills.tsx, experience.tsx and lib/site.ts.
-- Existing values always win. Unknown project case-study details and media stay empty.
insert into public.projects (title, slug, category, short_description, description, url, repo, tags, published, state, featured, sort_order)
select v.*, true, 'published', true, 0 from (values
 ('Darajni','darajni','E-commerce','Premium fashion e-commerce experience','An Indian fashion brand focused on premium ethnic and contemporary wear with a seamless e-commerce experience.','https://www.darajni.in',null::text,array['E-commerce','Fashion','Production']),
 ('New Talent Library','new-talent-library','Platform','A modern talent and digital innovation platform','A modern platform showcasing talent and digital innovation with responsive UI and scalable architecture.','https://newtalentlibrary.vercel.app/',null::text,array['Next.js','Platform','Responsive'])
) v(title,slug,category,short_description,description,url,repo,tags) where not exists (select 1 from public.projects p where p.title = v.title) on conflict do nothing;
-- Verified work visible on the current portfolio and the author's public GitHub.
insert into public.projects (title, slug, category, short_description, description, url, repo, tags, published, state, featured, sort_order)
select v.title, v.slug, v.category, v.short_description, v.description, v.url, v.repo, v.tags, true, 'published', true, v.sort_order from (values
 ('Aether-Ai','aether-ai','AI / ML','API-based chat application exploring multi-provider AI workflows','Aether-Ai is an API-based chatting application project with model selection and persistent conversations.','https://github.com/7amankrishna/Aether-Ai','https://github.com/7amankrishna/Aether-Ai',array['AI / ML','APIs','Chat'],3),
 ('SIH26056 / APIx','sih26056-apix','Data','Real-time airfare price index for India','A project for exploring real-time airfare price indexing and data-driven travel insights.','https://sih-26056-eta.vercel.app/','https://github.com/7amankrishna/SIH26056',array['Data','Python','Experimental'],4),
 ('N-Dimensional Explorer','n-dimensional-explorer','Experimental','Interactive mathematical visualizer from 2D to 32D','An interactive educational visualizer for exploring higher-dimensional spaces with generalized mathematical projections.','https://32-d-visualizer.vercel.app/','https://github.com/7amankrishna/32D-Visualizer',array['Mathematics','Visualization','Experimental'],5)
) v(title,slug,category,short_description,description,url,repo,tags,sort_order) where not exists (select 1 from public.projects p where p.title = v.title) on conflict do nothing;
-- Keep the readable legacy slugs for the verified projects created by the original schema.
update public.projects set slug = 'darajni' where title = 'Darajni' and slug like 'darajni-%';
update public.projects set slug = 'new-talent-library' where title = 'New Talent Library' and slug like 'new-talent-library-%';
insert into public.skills (name, category, sort_order) select v.* from (values ('C','Languages',1),('C++','Languages',2),('Python','Languages',3),('JavaScript','Languages',4),('TypeScript','Languages',5),('React','Frontend',6),('Next.js','Frontend',7),('HTML','Frontend',8),('CSS','Frontend',9),('Tailwind','Frontend',10),('Node.js','Backend',11),('Express','Backend',12),('Supabase','Backend',13),('PostgreSQL','Database',14),('Git','Tools',15),('GitHub','Tools',16),('VS Code','Tools',17),('Linux','Tools',18),('Vercel','Tools',19),('OpenAI APIs','AI',20),('Prompt Engineering','AI',21),('Machine Learning Basics','AI',22)) v(name,category,sort_order) where not exists (select 1 from public.skills s where s.name = v.name and s.category = v.category);
insert into public.journey_entries (label,title,description,period,sort_order) select v.* from (values ('Education','B.Tech Journey','Pursuing Computer Science Engineering — data structures, algorithms, OS, DBMS, and the fundamentals that make everything else possible.','Ongoing',1),('Learning','AI Learning','Studying machine learning foundations, working with OpenAI APIs, and practicing prompt engineering on real problems.','Continuous',2),('Building','Personal Projects','Built and deployed production sites like Darajni and New Talent Library — owning everything from design to deployment.','Always shipping',3),('Open Source','Open Source Contributions','Contributing to open source to learn from real codebases and give back to the tools I use daily.','Growing',4),('Exploration','Startup Exploration','Studying how products are built and scaled — with the goal of turning ideas into ventures.','Exploring',5)) v(label,title,description,period,sort_order) where not exists (select 1 from public.journey_entries j where j.title = v.title);
-- No verified named work-in-progress project was supplied; building_entries starts empty.
commit;
