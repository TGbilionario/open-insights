revoke execute on function public.sync_editorial_content_from_charge() from anon, authenticated;

create index if not exists ai_analysis_history_user_id_idx
  on public.ai_analysis_history(user_id);

create index if not exists ai_credit_ledger_user_id_idx
  on public.ai_credit_ledger(user_id);
