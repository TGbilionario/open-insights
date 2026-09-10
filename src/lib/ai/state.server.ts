import { supabaseAdmin } from "@/integrations/supabase/client.server";

import type { AiStateDTO, AnalysisRecordDTO } from "../ai-analysis.functions";
import { CREDIT_CONFIG } from "./credit-config.server";
import { getAiState } from "./credit-service.server";
import { getProviderStatus } from "./provider.server";

export async function buildState(userKey: string): Promise<AiStateDTO> {
  const state = await getAiState(userKey);
  const status = getProviderStatus();
  const testMode = process.env["AI_TEST_MODE"] === "true";
  return {
    communityRemaining: state.pool.credits_remaining,
    communityDailyLimit: state.pool.daily_credit_limit,
    resetAt: state.pool.reset_at,
    freeUsesUsed: state.usage.free_uses_used,
    freeUsesLimit: CREDIT_CONFIG.freeCommunityUsesPerCycle,
    personalBalance: state.wallet.balance,
    demoMode: !status.configured,
    provider: status.provider,
    model: status.model,
    reservationCredits: CREDIT_CONFIG.reservationCredits,
    provisional: CREDIT_CONFIG.provisional,
    testMode,
  };
}

type HistoryRow = {
  id: string;
  question: string;
  created_at: string;
  status: string;
  provider: string;
  model: string;
  credits_charged: number;
  credit_source: string;
  total_tokens: number;
  scenario_analysis: string | null;
  projection: string | null;
  consequences: string | null;
  most_likely_scenario: string | null;
  change_factors: string | null;
};

export function rowToRecord(row: HistoryRow): AnalysisRecordDTO {
  return {
    id: row.id,
    question: row.question,
    createdAt: row.created_at,
    status: row.status,
    provider: row.provider,
    model: row.model,
    demo: row.provider === "demo",
    creditsCharged: row.credits_charged,
    creditSource: row.credit_source,
    totalTokens: row.total_tokens,
    verificationSources: [],
    verificationStatus: "not_run",
    sections: {
      scenarioAnalysis: row.scenario_analysis ?? "",
      projection: row.projection ?? "",
      consequences: row.consequences ?? "",
      mostLikelyScenario: row.most_likely_scenario ?? "",
      changeFactors: row.change_factors ?? "",
    },
  };
}

export async function buildAdminStats() {
  const status = getProviderStatus();
  const { data: pool } = await supabaseAdmin
    .from("ai_credit_pool")
    .select("*")
    .eq("id", "global")
    .maybeSingle();

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: todays } = await supabaseAdmin
    .from("ai_analysis_history")
    .select("credits_charged,status")
    .gte("created_at", since);

  const completed = (todays ?? []).filter((r) => r.status === "completed");
  const charged = completed.reduce((sum, r) => sum + (r.credits_charged ?? 0), 0);

  const { data: wallets } = await supabaseAdmin
    .from("user_ai_wallets")
    .select("lifetime_purchased,lifetime_consumed,balance");
  const issued = (wallets ?? []).reduce((s, w) => s + (w.lifetime_purchased ?? 0), 0);
  const consumed = (wallets ?? []).reduce((s, w) => s + (w.lifetime_consumed ?? 0), 0);

  return {
    dailyCommunityAllocation: pool?.daily_credit_limit ?? CREDIT_CONFIG.provisionalDailyCommunityPool,
    communityRemaining: pool?.credits_remaining ?? 0,
    resetAt: pool?.reset_at ?? null,
    analysesToday: completed.length,
    averageCreditsPerAnalysis: completed.length ? Math.round((charged / completed.length) * 10) / 10 : 0,
    personalCreditsIssued: issued,
    personalCreditsConsumed: consumed,
    providerConfigured: status.configured,
    provider: status.provider,
    model: status.model,
    config: {
      inputWeight: CREDIT_CONFIG.inputWeight,
      outputWeight: CREDIT_CONFIG.outputWeight,
      reasoningWeight: CREDIT_CONFIG.reasoningWeight,
      tokenUnit: CREDIT_CONFIG.tokenUnit,
      reservationCredits: CREDIT_CONFIG.reservationCredits,
      freeCommunityUsesPerCycle: CREDIT_CONFIG.freeCommunityUsesPerCycle,
      provisional: CREDIT_CONFIG.provisional,
    },
  };
}
