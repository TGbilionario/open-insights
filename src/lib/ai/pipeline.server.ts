import { supabaseAdmin } from "@/integrations/supabase/client.server";

import type { AnalysisRecordDTO, RunAnalysisResult } from "../ai-analysis.functions";
import { CREDIT_CONFIG, computeCreditCost } from "./credit-config.server";
import { refundReservation, reserveCredits, settleCredits } from "./credit-service.server";
import { getAnalysisProvider } from "./provider.server";
import { buildState, rowToRecord } from "./state.server";

export async function runAnalysisPipeline(input: {
  userKey: string;
  question: string;
  context?: string | undefined;
}): Promise<RunAnalysisResult> {
  const { userKey, question } = input;
  const userId = null;
  const testMode = false;

  if (question.length < 10) {
    return {
      ok: false,
      reason: "invalid_input",
      message: "Escreva uma pergunta com pelo menos 10 caracteres.",
      state: await buildState(userKey),
    };
  }

  // 1) Reserve credits atomically before calling the provider.
  let source: "community" | "personal" = "community";
  let reserved = 0;
  if (!testMode) {
    const reservation = await reserveCredits(userKey, userId, CREDIT_CONFIG.reservationCredits);
    if (!reservation.ok) {
      return {
        ok: false,
        reason: "credits_exhausted",
        message:
          reservation.reason === "free_uses_exhausted"
            ? "Você já usou seus usos gratuitos de hoje e não há créditos pessoais suficientes."
            : "Os créditos gratuitos da comunidade acabaram por hoje.",
        state: await buildState(userKey),
      };
    }
    source = reservation.source;
    reserved = reservation.reserved;
  }

  const { data: pending, error: insertError } = await supabaseAdmin
    .from("ai_analysis_history")
    .insert({
      user_key: userKey,
      question,
      credits_reserved: reserved,
      credit_source: source,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !pending) {
    if (!testMode) {
      await refundReservation({
        userKey,
        userId,
        source,
        amount: reserved,
        analysisId: null,
        restoreFreeUse: source === "community",
      });
    }
    return {
      ok: false,
      reason: "provider_error",
      message: "Não foi possível registrar a análise. Tente novamente.",
      state: await buildState(userKey),
    };
  }

  const analysisId = pending.id;
  const provider = getAnalysisProvider();

  try {
    const result = await provider.generateAnalysis({ question, context: input.context });
    const charged = testMode ? 0 : computeCreditCost(result.usage);

    const { data: row, error: updateError } = await supabaseAdmin
      .from("ai_analysis_history")
      .update({
        scenario_analysis: result.analysis.scenarioAnalysis,
        projection: result.analysis.projection,
        consequences: result.analysis.consequences,
        most_likely_scenario: result.analysis.mostLikelyScenario,
        change_factors: result.analysis.changeFactors,
        credits_charged: charged,
        provider: result.provider,
        model: result.model,
        input_tokens: result.usage.inputTokens,
        output_tokens: result.usage.outputTokens,
        total_tokens: result.usage.totalTokens,
        status: "completed",
      })
      .eq("id", analysisId)
      .select("*")
      .single();
    if (updateError || !row) throw new Error(updateError?.message ?? "Falha ao salvar a análise.");

    if (!testMode) {
      await settleCredits({ userKey, userId, source, reserved, charged, analysisId });
    }

    const record: AnalysisRecordDTO = {
      ...rowToRecord(row),
      verificationSources: result.verificationSources,
      verificationStatus: result.verificationSources.length ? "sources_found" : "no_sources",
    };

    return {
      ok: true,
      record,
      state: await buildState(userKey),
      usageEstimated: result.usage.estimated,
    };
  } catch (error) {
    if (!testMode) {
      await refundReservation({
        userKey,
        userId,
        source,
        amount: reserved,
        analysisId,
        restoreFreeUse: source === "community",
      });
    }
    await supabaseAdmin
      .from("ai_analysis_history")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message.slice(0, 500) : "erro desconhecido",
      })
      .eq("id", analysisId);

    return {
      ok: false,
      reason: "provider_error",
      message: (() => {
        const detail = error instanceof Error ? error.message : "";
        const safe = detail.startsWith("Hugging Face:") || detail.startsWith("Provedor de IA respondeu");
        return safe
          ? `${detail} Nenhum crédito foi cobrado.`
          : "A análise falhou e nenhum crédito foi cobrado. Você pode tentar novamente.";
      })(),
      state: await buildState(userKey),
    };
  }
}
