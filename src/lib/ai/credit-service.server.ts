import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { CREDIT_CONFIG } from "./credit-config.server";

export type CreditSource = "community" | "personal";

export type AiState = {
  pool: { daily_credit_limit: number; credits_remaining: number; reset_at: string };
  usage: { free_uses_used: number; total_analyses: number };
  wallet: { balance: number; lifetime_purchased: number; lifetime_consumed: number };
};

type ReserveOk = { ok: true; source: CreditSource; reserved: number };
type ReserveFail = {
  ok: false;
  reason: string;
  free_uses_used?: number;
  personal_balance?: number;
  credits_remaining?: number;
  reset_at?: string;
};

export async function getAiState(userKey: string): Promise<AiState> {
  const { data, error } = await supabaseAdmin.rpc("ai_get_state", { p_user_key: userKey });
  if (error) throw new Error(error.message);
  return data as unknown as AiState;
}

export async function reserveCredits(
  userKey: string,
  userId: string | null,
  amount = CREDIT_CONFIG.reservationCredits,
): Promise<ReserveOk | ReserveFail> {
  const { data, error } = await supabaseAdmin.rpc("ai_reserve_credits", {
    p_user_key: userKey,
    p_user_id: userId as string,
    p_amount: amount,
    p_free_limit: CREDIT_CONFIG.freeCommunityUsesPerCycle,
  });
  if (error) throw new Error(error.message);
  return data as unknown as ReserveOk | ReserveFail;
}

export async function settleCredits(args: {
  userKey: string;
  userId: string | null;
  source: CreditSource;
  reserved: number;
  charged: number;
  analysisId: string;
}) {
  const { error } = await supabaseAdmin.rpc("ai_settle_credits", {
    p_user_key: args.userKey,
    p_user_id: args.userId as string,
    p_source: args.source,
    p_reserved: args.reserved,
    p_charged: args.charged,
    p_analysis_id: args.analysisId,
  });
  if (error) throw new Error(error.message);
}

export async function refundReservation(args: {
  userKey: string;
  userId: string | null;
  source: CreditSource;
  amount: number;
  analysisId: string | null;
  restoreFreeUse: boolean;
}) {
  const { error } = await supabaseAdmin.rpc("ai_refund_reservation", {
    p_user_key: args.userKey,
    p_user_id: args.userId as string,
    p_source: args.source,
    p_amount: args.amount,
    p_analysis_id: args.analysisId,
    p_restore_free_use: args.restoreFreeUse,
  });
  if (error) throw new Error(error.message);
}

export { supabaseAdmin };
