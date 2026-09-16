create table if not exists public.editorial_content (
  id uuid primary key default gen_random_uuid(),
  content_code text not null,
  title text not null,
  category text not null default 'PRINCIPAIS DO DIA',
  subcategory text not null default '',
  content_type text not null default 'FATO',
  status text not null default 'DESCOBERTO',
  published_at timestamptz,
  headline text not null default '',
  fact text not null default '',
  context text not null default '',
  analysis text not null default '',
  projection text not null default '',
  charge_phrase text not null default '',
  characters text not null default '',
  parties text not null default '',
  institutions text not null default '',
  subjects text not null default '',
  keywords text not null default '',
  sources text not null default '',
  relevance_score numeric not null default 0,
  editorial_note text not null default '',
  visual_concept text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.editorial_content
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.editorial_content
  add column if not exists created_at timestamptz not null default now();

alter table public.editorial_content
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists editorial_content_code_key
  on public.editorial_content(content_code);

create index if not exists editorial_content_status_idx
  on public.editorial_content(status, created_at desc);

create index if not exists editorial_content_category_idx
  on public.editorial_content(category, created_at desc);

create index if not exists editorial_content_relevance_idx
  on public.editorial_content(relevance_score desc, created_at desc);

create or replace function public.editorial_content_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists editorial_content_set_updated_at on public.editorial_content;
create trigger editorial_content_set_updated_at
before update on public.editorial_content
for each row execute function public.editorial_content_touch_updated_at();

alter table public.editorial_content enable row level security;

drop policy if exists "public can read editorial content" on public.editorial_content;
drop policy if exists "public can create editorial content" on public.editorial_content;
drop policy if exists "public can update editorial content" on public.editorial_content;
drop policy if exists "public can delete editorial content" on public.editorial_content;

create policy "public can read editorial content"
  on public.editorial_content for select
  to anon, authenticated
  using (true);

create policy "public can create editorial content"
  on public.editorial_content for insert
  to anon, authenticated
  with check (true);

create policy "public can update editorial content"
  on public.editorial_content for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "public can delete editorial content"
  on public.editorial_content for delete
  to anon, authenticated
  using (true);

grant select, insert, update, delete on public.editorial_content to anon, authenticated;
