-- Editorial production metadata and batch recovery hardening

create or replace function public.assign_editorial_production_metadata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date date;
  v_batch uuid;
  v_slot smallint;
begin
  v_date := coalesce(
    NEW.production_date,
    (NEW.published_at at time zone 'America/Sao_Paulo')::date,
    (now() at time zone 'America/Sao_Paulo')::date
  );
  NEW.production_date := v_date;
  NEW.content_type := coalesce(NEW.content_type, 'short');

  if NEW.production_batch_id is null then
    select id into v_batch
    from public.editorial_production_batches
    where status = 'running'
      and start_date <= v_date
      and end_date >= v_date
    order by created_at desc
    limit 1;
    NEW.production_batch_id := v_batch;
  end if;

  if NEW.publication_slot is null then
    select s into v_slot
    from generate_series(1,8) s
    where not exists (
      select 1
      from public.editorial_content ec
      where ec.production_date = v_date
        and ec.publication_slot = s
        and ec.id <> coalesce(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    )
    order by s
    limit 1;
    NEW.publication_slot := v_slot;
  end if;

  if NEW.publication_at is null and NEW.publication_slot between 1 and 8 then
    NEW.publication_at :=
      (v_date + case NEW.publication_slot
        when 1 then time '07:00'
        when 2 then time '08:30'
        when 3 then time '10:30'
        when 4 then time '12:00'
        when 5 then time '13:00'
        when 6 then time '15:30'
        when 7 then time '18:30'
        when 8 then time '20:30'
      end) at time zone 'America/Sao_Paulo';
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_assign_editorial_production_metadata on public.editorial_content;
create trigger trg_assign_editorial_production_metadata
before insert or update of production_date, production_batch_id, publication_slot, publication_at, published_at
on public.editorial_content
for each row execute function public.assign_editorial_production_metadata();

create or replace function public.increment_editorial_batch_on_content_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.editorial_status = 'approved'
     and NEW.production_batch_id is not null then
    update public.editorial_production_batches
    set produced_videos = least(target_videos, produced_videos + 1),
        status = case
          when least(target_videos, produced_videos + 1) >= target_videos then 'completed'
          else status
        end,
        completed_at = case
          when least(target_videos, produced_videos + 1) >= target_videos then coalesce(completed_at, now())
          else completed_at
        end,
        updated_at = now()
    where id = NEW.production_batch_id;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_increment_editorial_batch_on_content_insert on public.editorial_content;
create trigger trg_increment_editorial_batch_on_content_insert
after insert on public.editorial_content
for each row execute function public.increment_editorial_batch_on_content_insert();

create or replace function public.editorial_claim_due_batch(p_today date default current_date)
returns jsonb[]
language plpgsql
security definer
set search_path = public
as $function$
declare
  cfg public.editorial_automation_settings%rowtype;
  last_done date;
  running_id uuid;
  v_start date;
  v_end date;
  d date;
  created public.editorial_production_batches%rowtype;
  result jsonb[] := '{}'::jsonb[];
begin
  select * into cfg from public.editorial_automation_settings where id='default' for update;
  select max(end_date) into last_done
  from public.editorial_production_batches
  where status='completed';

  if last_done is not null and p_today < last_done + cfg.batch_days then
    return result;
  end if;

  select id into running_id
  from public.editorial_production_batches
  where status='running'
  order by started_at desc nulls last, created_at desc
  limit 1;

  if running_id is not null then
    return result;
  end if;

  v_start := coalesce(last_done + 1, cfg.first_production_date, p_today);
  v_end := least(p_today, v_start + cfg.batch_days - 1);

  select * into created
  from public.editorial_production_batches
  where start_date = v_start
    and end_date = v_end
    and status in ('planned','failed','partial')
  order by created_at desc
  limit 1
  for update;

  if created.id is not null then
    update public.editorial_production_batches
    set status='running',
        started_at=coalesce(started_at, now()),
        completed_at=null,
        error_message=null,
        target_days=(v_end-v_start)+1,
        target_videos_per_day=cfg.daily_target_videos,
        target_videos=((v_end-v_start)+1)*cfg.daily_target_videos,
        updated_at=now()
    where id=created.id
    returning * into created;
  else
    insert into public.editorial_production_batches
      (batch_code,start_date,end_date,status,target_days,target_videos_per_day,target_videos,started_at,updated_at)
    values
      ('BATCH-' || to_char(v_start,'YYYYMMDD') || '-' || to_char(v_end,'YYYYMMDD'),
       v_start,v_end,'running',(v_end-v_start)+1,cfg.daily_target_videos,
       ((v_end-v_start)+1)*cfg.daily_target_videos,now(),now())
    returning * into created;
  end if;

  d := v_start;
  while d <= v_end loop
    result := result || jsonb_build_object(
      'batch_id', created.id,
      'batch_code', created.batch_code,
      'start_date', created.start_date,
      'end_date', created.end_date,
      'production_date', to_char(d,'YYYY-MM-DD'),
      'target_videos_per_day', created.target_videos_per_day
    );
    d := d + 1;
  end loop;

  return result;
end;
$function$;

revoke all on function public.assign_editorial_production_metadata() from public, anon, authenticated;
revoke all on function public.increment_editorial_batch_on_content_insert() from public, anon, authenticated;
revoke all on function public.editorial_claim_due_batch(date) from public, anon, authenticated;
grant execute on function public.editorial_claim_due_batch(date) to service_role;
