create table if not exists public.editorial_automation_settings (
  id text primary key default 'default',
  batch_days integer not null default 10 check (batch_days between 1 and 31),
  daily_target_videos integer not null default 8 check (daily_target_videos between 1 and 10),
  timezone text not null default 'America/Sao_Paulo',
  first_production_date date,
  updated_at timestamptz not null default now(),
  constraint editorial_automation_settings_singleton check (id = 'default')
);

insert into public.editorial_automation_settings (id)
values ('default')
on conflict (id) do nothing;

create table if not exists public.editorial_production_batches (
  id uuid primary key default gen_random_uuid(),
  batch_code text not null unique,
  start_date date not null,
  end_date date not null,
  status text not null default 'planned' check (status in ('planned','running','completed','partial','failed')),
  target_days integer not null default 10,
  target_videos_per_day integer not null default 8,
  target_videos integer not null default 80,
  produced_videos integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint editorial_production_batches_valid_range check (end_date >= start_date)
);

alter table public.editorial_content
  add column if not exists publication_at timestamptz,
  add column if not exists publication_slot smallint,
  add column if not exists content_type text,
  add column if not exists production_batch_id uuid,
  add column if not exists production_date date;

alter table public.editorial_content
  drop constraint if exists editorial_content_production_batch_id_fkey;

alter table public.editorial_content
  add constraint editorial_content_production_batch_id_fkey
  foreign key (production_batch_id) references public.editorial_production_batches(id) on delete set null;

create index if not exists editorial_content_publication_at_idx on public.editorial_content (publication_at);
create index if not exists editorial_content_production_date_idx on public.editorial_content (production_date);
create index if not exists editorial_content_production_batch_idx on public.editorial_content (production_batch_id);

create unique index if not exists editorial_content_publication_slot_unique_idx
  on public.editorial_content (publication_at, publication_slot)
  where publication_at is not null and publication_slot is not null;

create or replace function public.editorial_next_batch_window(p_today date default current_date)
returns table (start_date date, end_date date, batch_days integer, daily_target_videos integer, timezone text)
language sql stable set search_path = public
as $$
  with cfg as (select * from public.editorial_automation_settings where id = 'default'),
  last_done as (select max(end_date) as end_date from public.editorial_production_batches where status = 'completed')
  select
    coalesce(last_done.end_date + 1, cfg.first_production_date, p_today) as start_date,
    least(p_today, coalesce(last_done.end_date + 1, cfg.first_production_date, p_today) + (cfg.batch_days - 1)) as end_date,
    cfg.batch_days, cfg.daily_target_videos, cfg.timezone
  from cfg cross join last_done;
$$;

create or replace function public.editorial_claim_next_batch(p_today date default current_date)
returns public.editorial_production_batches
language plpgsql security definer set search_path = public
as $$
declare
  cfg public.editorial_automation_settings%rowtype;
  last_done date;
  v_start date;
  v_end date;
  existing public.editorial_production_batches%rowtype;
  created public.editorial_production_batches%rowtype;
begin
  select * into cfg from public.editorial_automation_settings where id = 'default' for update;
  select max(end_date) into last_done from public.editorial_production_batches where status = 'completed';
  v_start := coalesce(last_done + 1, cfg.first_production_date, p_today);
  v_end := least(p_today, v_start + cfg.batch_days - 1);
  if v_start > p_today then raise exception 'NO_PENDING_EDITORIAL_DATES'; end if;

  select * into existing
  from public.editorial_production_batches
  where start_date = v_start and end_date = v_end and status in ('planned','running')
  order by created_at desc limit 1;

  if existing.id is not null then return existing; end if;

  insert into public.editorial_production_batches
    (batch_code,start_date,end_date,status,target_days,target_videos_per_day,target_videos,started_at,updated_at)
  values
    ('BATCH-' || to_char(v_start,'YYYYMMDD') || '-' || to_char(v_end,'YYYYMMDD'),
     v_start,v_end,'running',(v_end-v_start)+1,cfg.daily_target_videos,
     ((v_end-v_start)+1)*cfg.daily_target_videos,now(),now())
  returning * into created;

  return created;
end;
$$;

alter table public.editorial_automation_settings enable row level security;
alter table public.editorial_production_batches enable row level security;

drop policy if exists "authenticated can read editorial automation settings" on public.editorial_automation_settings;
create policy "authenticated can read editorial automation settings"
  on public.editorial_automation_settings for select to authenticated using (true);

drop policy if exists "authenticated can read editorial production batches" on public.editorial_production_batches;
create policy "authenticated can read editorial production batches"
  on public.editorial_production_batches for select to authenticated using (true);

revoke execute on function public.editorial_next_batch_window(date) from public, anon, authenticated;
revoke execute on function public.editorial_claim_next_batch(date) from public, anon, authenticated;
grant execute on function public.editorial_next_batch_window(date) to service_role;
grant execute on function public.editorial_claim_next_batch(date) to service_role;
