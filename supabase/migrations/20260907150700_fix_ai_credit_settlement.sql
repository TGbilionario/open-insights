-- Corrige a contabilização do settlement para que reserva + reembolso
-- representem exatamente o custo final, sem uma segunda cobrança.
CREATE OR REPLACE FUNCTION public.ai_settle_credits(
  p_user_key text, p_user_id uuid, p_source text,
  p_reserved integer, p_charged integer, p_analysis_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  refund integer := GREATEST(p_reserved - GREATEST(p_charged, 0), 0);
  extra integer := GREATEST(GREATEST(p_charged, 0) - p_reserved, 0);
BEGIN
  IF p_source = 'community' THEN
    IF refund > 0 THEN
      UPDATE public.ai_credit_pool
        SET credits_remaining = credits_remaining + refund, updated_at = now()
        WHERE id = 'global';
      INSERT INTO public.ai_credit_ledger
        (user_key, user_id, type, amount, analysis_id, metadata)
      VALUES
        (p_user_key, p_user_id, 'community_refund', refund, p_analysis_id,
         jsonb_build_object('stage','settle'));
    END IF;
    IF extra > 0 THEN
      UPDATE public.ai_credit_pool
        SET credits_remaining = GREATEST(credits_remaining - extra, 0), updated_at = now()
        WHERE id = 'global';
      INSERT INTO public.ai_credit_ledger
        (user_key, user_id, type, amount, analysis_id, metadata)
      VALUES
        (p_user_key, p_user_id, 'community_reserve', -extra, p_analysis_id,
         jsonb_build_object('stage','extra_charge'));
    END IF;
  ELSE
    IF refund > 0 THEN
      UPDATE public.user_ai_wallets
        SET balance = balance + refund, updated_at = now()
        WHERE user_key = p_user_key;
      INSERT INTO public.ai_credit_ledger
        (user_key, user_id, type, amount, analysis_id, metadata)
      VALUES
        (p_user_key, p_user_id, 'personal_refund', refund, p_analysis_id,
         jsonb_build_object('stage','settle'));
    END IF;
    IF extra > 0 THEN
      UPDATE public.user_ai_wallets
        SET balance = GREATEST(balance - extra, 0), updated_at = now()
        WHERE user_key = p_user_key;
      INSERT INTO public.ai_credit_ledger
        (user_key, user_id, type, amount, analysis_id, metadata)
      VALUES
        (p_user_key, p_user_id, 'personal_charge', -extra, p_analysis_id,
         jsonb_build_object('stage','extra_charge'));
    END IF;
    UPDATE public.user_ai_wallets
      SET lifetime_consumed = lifetime_consumed + GREATEST(p_charged,0),
          updated_at = now()
      WHERE user_key = p_user_key;
  END IF;

  UPDATE public.user_ai_usage
    SET total_analyses = total_analyses + 1, updated_at = now()
    WHERE user_key = p_user_key;

  RETURN jsonb_build_object('ok', true, 'refunded', refund, 'charged', GREATEST(p_charged,0));
END;
$$;

REVOKE ALL ON FUNCTION public.ai_settle_credits(text, uuid, text, integer, integer, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_settle_credits(text, uuid, text, integer, integer, uuid) TO service_role;
