CREATE OR REPLACE FUNCTION public.ai_next_reset()
RETURNS timestamptz
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT ((date_trunc('day', (now() AT TIME ZONE 'America/Sao_Paulo')) + interval '1 day') AT TIME ZONE 'America/Sao_Paulo');
$$;

CREATE TABLE public.ai_credit_pool (
  id text PRIMARY KEY DEFAULT 'global',
  daily_credit_limit integer NOT NULL DEFAULT 10000 CHECK (daily_credit_limit >= 0),
  credits_remaining integer NOT NULL DEFAULT 10000 CHECK (credits_remaining >= 0),
  reset_at timestamptz NOT NULL DEFAULT public.ai_next_reset(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_credit_pool_singleton CHECK (id = 'global')
);
GRANT ALL ON public.ai_credit_pool TO service_role;
ALTER TABLE public.ai_credit_pool ENABLE ROW LEVEL SECURITY;

INSERT INTO public.ai_credit_pool (id) VALUES ('global');

CREATE TABLE public.user_ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  free_uses_used integer NOT NULL DEFAULT 0 CHECK (free_uses_used >= 0),
  total_analyses integer NOT NULL DEFAULT 0 CHECK (total_analyses >= 0),
  last_reset_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.user_ai_usage TO service_role;
ALTER TABLE public.user_ai_usage ENABLE ROW LEVEL SECURITY;
CREATE INDEX user_ai_usage_user_id_idx ON public.user_ai_usage(user_id);

CREATE TABLE public.user_ai_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_purchased integer NOT NULL DEFAULT 0 CHECK (lifetime_purchased >= 0),
  lifetime_consumed integer NOT NULL DEFAULT 0 CHECK (lifetime_consumed >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.user_ai_wallets TO service_role;
ALTER TABLE public.user_ai_wallets ENABLE ROW LEVEL SECURITY;
CREATE INDEX user_ai_wallets_user_id_idx ON public.user_ai_wallets(user_id);

CREATE TABLE public.ai_analysis_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  question text NOT NULL CHECK (char_length(question) BETWEEN 3 AND 2000),
  scenario_analysis text,
  projection text,
  consequences text,
  most_likely_scenario text,
  change_factors text,
  credits_reserved integer NOT NULL DEFAULT 0 CHECK (credits_reserved >= 0),
  credits_charged integer NOT NULL DEFAULT 0 CHECK (credits_charged >= 0),
  credit_source text NOT NULL DEFAULT 'community' CHECK (credit_source IN ('community','personal')),
  provider text NOT NULL DEFAULT 'demo',
  model text NOT NULL DEFAULT 'demo',
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ai_analysis_history TO service_role;
ALTER TABLE public.ai_analysis_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX ai_analysis_history_user_key_idx ON public.ai_analysis_history(user_key, created_at DESC);
CREATE INDEX ai_analysis_history_created_at_idx ON public.ai_analysis_history(created_at DESC);

CREATE TABLE public.ai_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('community_reserve','community_charge','community_refund','personal_purchase','personal_charge','personal_refund','manual_adjustment')),
  amount integer NOT NULL,
  analysis_id uuid REFERENCES public.ai_analysis_history(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ai_credit_ledger TO service_role;
ALTER TABLE public.ai_credit_ledger ENABLE ROW LEVEL SECURITY;
CREATE INDEX ai_credit_ledger_created_at_idx ON public.ai_credit_ledger(created_at DESC);
CREATE INDEX ai_credit_ledger_analysis_idx ON public.ai_credit_ledger(analysis_id);

CREATE OR REPLACE FUNCTION public.ai_sync_pool()
RETURNS public.ai_credit_pool
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pool public.ai_credit_pool;
BEGIN
  SELECT * INTO pool FROM public.ai_credit_pool WHERE id = 'global' FOR UPDATE;
  IF pool IS NULL THEN
    INSERT INTO public.ai_credit_pool (id) VALUES ('global') RETURNING * INTO pool;
  END IF;
  IF now() >= pool.reset_at THEN
    UPDATE public.ai_credit_pool
      SET credits_remaining = daily_credit_limit,
          reset_at = public.ai_next_reset(),
          updated_at = now()
      WHERE id = 'global'
      RETURNING * INTO pool;
  END IF;
  RETURN pool;
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_get_state(p_user_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pool public.ai_credit_pool;
  usage public.user_ai_usage;
  wallet public.user_ai_wallets;
BEGIN
  pool := public.ai_sync_pool();

  INSERT INTO public.user_ai_usage (user_key) VALUES (p_user_key) ON CONFLICT (user_key) DO NOTHING;
  INSERT INTO public.user_ai_wallets (user_key) VALUES (p_user_key) ON CONFLICT (user_key) DO NOTHING;

  SELECT * INTO usage FROM public.user_ai_usage WHERE user_key = p_user_key;
  IF usage.last_reset_at < pool.reset_at - interval '1 day' THEN
    UPDATE public.user_ai_usage SET free_uses_used = 0, last_reset_at = now(), updated_at = now()
      WHERE user_key = p_user_key RETURNING * INTO usage;
  END IF;

  SELECT * INTO wallet FROM public.user_ai_wallets WHERE user_key = p_user_key;

  RETURN jsonb_build_object(
    'pool', jsonb_build_object('daily_credit_limit', pool.daily_credit_limit, 'credits_remaining', pool.credits_remaining, 'reset_at', pool.reset_at),
    'usage', jsonb_build_object('free_uses_used', usage.free_uses_used, 'total_analyses', usage.total_analyses),
    'wallet', jsonb_build_object('balance', wallet.balance, 'lifetime_purchased', wallet.lifetime_purchased, 'lifetime_consumed', wallet.lifetime_consumed)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_reserve_credits(p_user_key text, p_user_id uuid, p_amount integer, p_free_limit integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pool public.ai_credit_pool;
  usage public.user_ai_usage;
  wallet public.user_ai_wallets;
  updated integer;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_amount');
  END IF;

  pool := public.ai_sync_pool();

  INSERT INTO public.user_ai_usage (user_key, user_id) VALUES (p_user_key, p_user_id) ON CONFLICT (user_key) DO NOTHING;
  INSERT INTO public.user_ai_wallets (user_key, user_id) VALUES (p_user_key, p_user_id) ON CONFLICT (user_key) DO NOTHING;

  SELECT * INTO usage FROM public.user_ai_usage WHERE user_key = p_user_key FOR UPDATE;
  IF usage.last_reset_at < pool.reset_at - interval '1 day' THEN
    UPDATE public.user_ai_usage SET free_uses_used = 0, last_reset_at = now(), updated_at = now()
      WHERE user_key = p_user_key RETURNING * INTO usage;
  END IF;

  IF usage.free_uses_used < p_free_limit THEN
    UPDATE public.ai_credit_pool SET credits_remaining = credits_remaining - p_amount, updated_at = now()
      WHERE id = 'global' AND credits_remaining >= p_amount;
    GET DIAGNOSTICS updated = ROW_COUNT;
    IF updated = 1 THEN
      UPDATE public.user_ai_usage SET free_uses_used = free_uses_used + 1, updated_at = now() WHERE user_key = p_user_key;
      INSERT INTO public.ai_credit_ledger (user_key, user_id, type, amount, metadata)
        VALUES (p_user_key, p_user_id, 'community_reserve', -p_amount, jsonb_build_object('stage','reserve'));
      RETURN jsonb_build_object('ok', true, 'source', 'community', 'reserved', p_amount);
    END IF;
  END IF;

  UPDATE public.user_ai_wallets SET balance = balance - p_amount, updated_at = now()
    WHERE user_key = p_user_key AND balance >= p_amount;
  GET DIAGNOSTICS updated = ROW_COUNT;
  IF updated = 1 THEN
    INSERT INTO public.ai_credit_ledger (user_key, user_id, type, amount, metadata)
      VALUES (p_user_key, p_user_id, 'personal_charge', -p_amount, jsonb_build_object('stage','reserve'));
    RETURN jsonb_build_object('ok', true, 'source', 'personal', 'reserved', p_amount);
  END IF;

  SELECT * INTO wallet FROM public.user_ai_wallets WHERE user_key = p_user_key;
  SELECT * INTO pool FROM public.ai_credit_pool WHERE id = 'global';

  RETURN jsonb_build_object(
    'ok', false,
    'reason', CASE WHEN usage.free_uses_used >= p_free_limit THEN 'free_uses_exhausted' ELSE 'community_pool_empty' END,
    'free_uses_used', usage.free_uses_used,
    'personal_balance', wallet.balance,
    'credits_remaining', pool.credits_remaining,
    'reset_at', pool.reset_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_settle_credits(p_user_key text, p_user_id uuid, p_source text, p_reserved integer, p_charged integer, p_analysis_id uuid)
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
      UPDATE public.ai_credit_pool SET credits_remaining = credits_remaining + refund, updated_at = now() WHERE id = 'global';
      INSERT INTO public.ai_credit_ledger (user_key, user_id, type, amount, analysis_id, metadata)
        VALUES (p_user_key, p_user_id, 'community_refund', refund, p_analysis_id, jsonb_build_object('stage','settle'));
    END IF;
    IF extra > 0 THEN
      UPDATE public.ai_credit_pool SET credits_remaining = GREATEST(credits_remaining - extra, 0), updated_at = now() WHERE id = 'global';
    END IF;
    -- A reserva já foi registrada no ledger. O reembolso da diferença completa
    -- a trilha contábil; não registrar uma segunda cobrança aqui para evitar
    -- descontar duas vezes no ledger.
  ELSE
    IF refund > 0 THEN
      UPDATE public.user_ai_wallets SET balance = balance + refund, updated_at = now() WHERE user_key = p_user_key;
      INSERT INTO public.ai_credit_ledger (user_key, user_id, type, amount, analysis_id, metadata)
        VALUES (p_user_key, p_user_id, 'personal_refund', refund, p_analysis_id, jsonb_build_object('stage','settle'));
    END IF;
    IF extra > 0 THEN
      UPDATE public.user_ai_wallets SET balance = GREATEST(balance - extra, 0), updated_at = now() WHERE user_key = p_user_key;
    END IF;
    UPDATE public.user_ai_wallets
      SET lifetime_consumed = lifetime_consumed + GREATEST(p_charged,0),
          updated_at = now()
      WHERE user_key = p_user_key;
  END IF;

  UPDATE public.user_ai_usage SET total_analyses = total_analyses + 1, updated_at = now() WHERE user_key = p_user_key;

  RETURN jsonb_build_object('ok', true, 'refunded', refund, 'charged', GREATEST(p_charged,0));
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_refund_reservation(p_user_key text, p_user_id uuid, p_source text, p_amount integer, p_analysis_id uuid, p_restore_free_use boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_source = 'community' THEN
    UPDATE public.ai_credit_pool SET credits_remaining = credits_remaining + p_amount, updated_at = now() WHERE id = 'global';
    INSERT INTO public.ai_credit_ledger (user_key, user_id, type, amount, analysis_id, metadata)
      VALUES (p_user_key, p_user_id, 'community_refund', p_amount, p_analysis_id, jsonb_build_object('stage','failure'));
    IF p_restore_free_use THEN
      UPDATE public.user_ai_usage SET free_uses_used = GREATEST(free_uses_used - 1, 0), updated_at = now() WHERE user_key = p_user_key;
    END IF;
  ELSE
    UPDATE public.user_ai_wallets SET balance = balance + p_amount, updated_at = now() WHERE user_key = p_user_key;
    INSERT INTO public.ai_credit_ledger (user_key, user_id, type, amount, analysis_id, metadata)
      VALUES (p_user_key, p_user_id, 'personal_refund', p_amount, p_analysis_id, jsonb_build_object('stage','failure'));
  END IF;
  RETURN jsonb_build_object('ok', true, 'refunded', p_amount);
END;
$$;

REVOKE ALL ON FUNCTION public.ai_sync_pool() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_get_state(text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_reserve_credits(text, uuid, integer, integer) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_settle_credits(text, uuid, text, integer, integer, uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_refund_reservation(text, uuid, text, integer, uuid, boolean) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_get_state(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_reserve_credits(text, uuid, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_settle_credits(text, uuid, text, integer, integer, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_refund_reservation(text, uuid, text, integer, uuid, boolean) TO service_role;