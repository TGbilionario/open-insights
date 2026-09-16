alter table public.editorial_charges
  add column if not exists source_content_id uuid;

create index if not exists editorial_charges_source_content_id_idx
  on public.editorial_charges(source_content_id);

alter table public.editorial_charges
  drop constraint if exists editorial_charges_source_content_id_fkey;

alter table public.editorial_charges
  add constraint editorial_charges_source_content_id_fkey
  foreign key (source_content_id)
  references public.editorial_content(id)
  on delete set null;

create or replace function public.sync_editorial_content_from_charge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_status text;
begin
  if new.source_content_id is null then
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
    set editorial_status = target_status,
        updated_at = now()
    where id = new.source_content_id
      and editorial_status <> 'PUBLICADO';
  end if;

  return new;
end;
$$;

drop trigger if exists editorial_charge_sync_content on public.editorial_charges;

create trigger editorial_charge_sync_content
after insert or update of stage, source_content_id
on public.editorial_charges
for each row execute function public.sync_editorial_content_from_charge();
