alter table public.editorial_charges
  add column if not exists source_content_code text;

create index if not exists editorial_charges_source_content_code_idx
  on public.editorial_charges(source_content_code);

update public.editorial_charges
set source_content_code = nullif(metadata->>'source_content_code', '')
where source_content_code is null
  and metadata ? 'source_content_code';

create or replace function public.sync_editorial_content_from_charge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_code text;
  target_status text;
begin
  target_code := coalesce(new.source_content_code, nullif(new.metadata->>'source_content_code', ''));
  if target_code is null then
    return new;
  end if;

  target_status := case new.stage
    when 'PAUTA' then 'PAUTA APROVADA'
    when 'CONCEITO' then 'PRODUÇÃO VISUAL'
    when 'FRASE' then 'PRODUÇÃO VISUAL'
    when 'STORYBOARD' then 'PRODUÇÃO VISUAL'
    when 'PROMPT' then 'PRODUÇÃO VISUAL'
    when 'GERAÇÃO' then 'PRODUÇÃO VISUAL'
    when 'VALIDAÇÃO' then 'VERIFICAÇÃO'
    when 'APROVADA' then 'PRONTO'
    else null
  end;

  if target_status is not null then
    update public.editorial_content
    set status = target_status,
        updated_at = now()
    where content_code = target_code
      and status <> 'PUBLICADO';
  end if;

  return new;
end;
$$;

drop trigger if exists editorial_charge_sync_content on public.editorial_charges;
create trigger editorial_charge_sync_content
after insert or update of stage, source_content_code, metadata
on public.editorial_charges
for each row execute function public.sync_editorial_content_from_charge();
