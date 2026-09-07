/**
 * Configuração central e PROVISÓRIA do motor de créditos da IA.
 *
 * ATENÇÃO: todos os valores abaixo são placeholders de desenvolvimento.
 * Eles NÃO representam precificação comercial final e devem ser recalibrados
 * após medições reais com o provedor.
 *
 * Unidade: "crédito do app" é uma unidade própria — NÃO é 1 token = 1 crédito.
 */

export const CREDIT_CONFIG = {
  provisional: true,

  /** Fórmula: ceil((in*inW + out*outW + reasoning*reaW) / tokenUnit) */
  inputWeight: 1,
  outputWeight: 4,
  reasoningWeight: 4,
  tokenUnit: 200,

  /** Piso de cobrança por análise concluída. */
  minimumChargePerAnalysis: 1,

  /** Reserva feita ANTES da chamada ao provedor (estimativa conservadora). */
  reservationCredits: 40,

  /** Máximo de análises gratuitas da comunidade por pessoa, por ciclo diário. */
  freeCommunityUsesPerCycle: 2,

  /** Alocação diária provisória da comunidade (também é o default no banco). */
  provisionalDailyCommunityPool: 10000,

  /** Aproximação usada quando o provedor não devolve metadados de tokens. */
  charsPerTokenEstimate: 4,
} as const;

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  estimated: boolean;
};

/** Estimativa de tokens por caracteres, usada como fallback. */
export function estimateUsage(promptText: string, answerText: string): TokenUsage {
  const per = CREDIT_CONFIG.charsPerTokenEstimate;
  const inputTokens = Math.ceil(promptText.length / per);
  const outputTokens = Math.ceil(answerText.length / per);
  return {
    inputTokens,
    outputTokens,
    reasoningTokens: 0,
    totalTokens: inputTokens + outputTokens,
    estimated: true,
  };
}

export function computeCreditCost(usage: TokenUsage): number {
  const weighted =
    usage.inputTokens * CREDIT_CONFIG.inputWeight +
    usage.outputTokens * CREDIT_CONFIG.outputWeight +
    usage.reasoningTokens * CREDIT_CONFIG.reasoningWeight;
  const cost = Math.ceil(weighted / CREDIT_CONFIG.tokenUnit);
  return Math.max(cost, CREDIT_CONFIG.minimumChargePerAnalysis);
}
