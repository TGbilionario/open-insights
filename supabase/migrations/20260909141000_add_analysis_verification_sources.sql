alter table public.ai_analysis_history
  add column if not exists verification_sources jsonb not null default '[]'::jsonb;

alter table public.ai_analysis_history
  add column if not exists verification_checked_at timestamptz;

alter table public.ai_analysis_history
  add column if not exists verification_status text not null default 'not_run'
    check (verification_status in ('not_run','sources_found','no_sources'));

create index if not exists ai_analysis_history_verification_checked_at_idx
  on public.ai_analysis_history (verification_checked_at desc);
