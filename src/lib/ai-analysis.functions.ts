import { createServerFn } from "@tanstack/react-start";

export type AnalysisSectionsDTO = {
  scenarioAnalysis: string;
  projection: string;
  consequences: string;
  mostLikelyScenario: string;
  changeFactors: string;
};

export type AiStateDTO = {
  communityRemaining: number;
  communityDailyLimit: number;
  resetAt: string;
  freeUsesUsed: number;
  freeUsesLimit: number;
  personalBalance: number;
  demoMode: boolean;
  provider: string;
  model: string;
  reservationCredits: number;
  provisional: boolean;
};

export type AnalysisRecordDTO = {
  id: string;
  question: string;
  createdAt: string;
  status: string;
  provider: string;
  model: string;
  demo: boolean;
  creditsCharged: number;
  creditSource: string;
  totalTokens: number;
  sections: AnalysisSectionsDTO;
};

export type RunAnalysisResult =
  | { ok: true; record: AnalysisRecordDTO; state: AiStateDTO; usageEstimated: boolean }
  | { ok: false; reason: "credits_exhausted" | "provider_error" | "invalid_input"; message: string; state: AiStateDTO };

const validateKey = (value: unknown): string => {
  if (typeof value !== "string" || value.length < 8 || value.length > 100) {
    throw new Error("Identificador de sessão inválido.");
  }
  return value;
};

export const getAiAnalysisState = createServerFn({ method: "POST" })
  .inputValidator((data: { userKey: string }) => ({ userKey: validateKey(data.userKey) }))
  .handler(async ({ data }): Promise<AiStateDTO> => {
    const { buildState } = await import("./ai/state.server");
    return buildState(data.userKey);
  });

export const getAiAnalysisHistory = createServerFn({ method: "POST" })
  .inputValidator((data: { userKey: string }) => ({ userKey: validateKey(data.userKey) }))
  .handler(async ({ data }): Promise<AnalysisRecordDTO[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { rowToRecord } = await import("./ai/state.server");
    const { data: rows, error } = await supabaseAdmin
      .from("ai_analysis_history")
      .select("*")
      .eq("user_key", data.userKey)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return (rows ?? []).map(rowToRecord);
  });

export const runAiAnalysis = createServerFn({ method: "POST" })
  .inputValidator((data: { userKey: string; question: string; context?: string }) => ({
    userKey: validateKey(data.userKey),
    question: String(data.question ?? "").trim().slice(0, 2000),
    context: typeof data.context === "string" ? data.context.slice(0, 8000) : undefined,
  }))
  .handler(async ({ data }): Promise<RunAnalysisResult> => {
    const { runAnalysisPipeline } = await import("./ai/pipeline.server");
    return runAnalysisPipeline(data);
  });

export const getAiAdminStats = createServerFn({ method: "GET" }).handler(async () => {
  const { buildAdminStats } = await import("./ai/state.server");
  return buildAdminStats();
});

export type AiAdminStats = Awaited<ReturnType<typeof getAiAdminStats>>;
