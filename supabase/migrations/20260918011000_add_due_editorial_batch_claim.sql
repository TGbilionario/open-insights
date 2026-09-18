create or replace function public.editorial_claim_due_batch(p_today date default current_date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg public.editorial_automation_settings%rowtype;
  last_done date;
  running_id uuid;
  v_start date;
  v_end date;
  v_days jsonb := '[]'::jsonb;
  d date;
  created public.editorial_production_batches%rowtype;
begin
  select * into cfg from public.editorial_automation_settings where id='default' for update;
  select max(end_date) into last_done
    from public.editorial_production_batches
    where status='completed';

  if last_done is not null and p_today < last_done + cfg.batch_days then
    return null;
  end if;

  select id into running_id
    from public.editorial_production_batches
    where status='running'
    order by started_at desc nulls last, created_at desc
    limit 1;

  if running_id is not null then
    return null;
  end if;

  v_start := coalesce(last_done + 1, cfg.first_production_date, p_today);
  v_end := least(p_today, v_start + cfg.batch_days - 1);

  insert into public.editorial_production_batches
    (batch_code,start_date,end_date,status,target_days,target_videos_per_day,target_videos,started_at,updated_at)
  values
    ('BATCH-' || to_char(v_start,'YYYYMMDD') || '-' || to_char(v_end,'YYYYMMDD'),
     v_start,v_end,'running',(v_end-v_start)+1,cfg.daily_target_videos,
     ((v_end-v_start)+1)*cfg.daily_target_videos,now(),now())
  returning * into created;

  d := v_start;
  while d <= v_end loop
    v_days := v_days || jsonb_build_array(to_char(d,'YYYY-MM-DD'));
    d := d + 1;
  end loop;

  return jsonb_build_object(
    'batch_id', created.id,
    'batch_code', created.batch_code,
    'start_date', created.start_date,
    'end_date', created.end_date,
    'target_days', created.target_days,
    'target_videos_per_day', created.target_videos_per_day,
    'target_videos', created.target_videos,
    'dates', v_days
  );
end;
$$;

revoke execute on function public.editorial_claim_due_batch(date) from public, anon, authenticated;
grant execute on function public.editorial_claim_due_batch(date) to service_role;
