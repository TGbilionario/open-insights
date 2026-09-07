import {
  CREDIT_CONFIG,
  estimateUsage,
  type TokenUsage,
} from "./credit-config.server";

export type AnalysisSections = {
  scenarioAnalysis: string;
  projection: string;
  consequences: string;
  mostLikelyScenario: string;
  changeFactors: string;
};

export type GenerateAnalysisInput = {
  question: string;
  context?: string | undefined;
};

export type GenerateAnalysisResult = {
  analysis: AnalysisSections;
  usage: TokenUsage;
  provider: string;
  model: string;
  demo: boolean;
};

export interface AiAnalysisProvider {
  readonly name: string;
  readonly model: string;
  readonly demo: boolean;
  generateAnalysis(input: GenerateAnalysisInput): Promise<GenerateAnalysisResult>;
}

const SYSTEM_PROMPT = `Você é um analista político brasileiro, especializado em política nacional, Congresso, Judiciário eleitoral e eleições no Brasil.

Regras obrigatórias:
- Separe claramente FATO de INFERÊNCIA. Nunca apresente especulação como certeza.
- Use linguagem condicional em projeções ("pode", "tende a", "é plausível que").
- Se o contexto fornecido for insuficiente ou desatualizado, diga isso explicitamente na análise.
- Não invente fontes, números, datas, pesquisas ou declarações. Se não souber, afirme que não há base suficiente.
- Não faça persuasão partidária, não recomende voto e não ataque nem promova pessoas ou partidos.
- Seja conciso porém substantivo: 3 a 6 frases por seção.
- Responda sempre em português do Brasil.

Responda SOMENTE com um objeto JSON válido, com exatamente estas chaves:
{"scenarioAnalysis":"...","projection":"...","consequences":"...","mostLikelyScenario":"...","changeFactors":"..."}`;

function buildUserPrompt(input: GenerateAnalysisInput): string {
  const context = input.context?.trim();
  return [
    `Pergunta do usuário: ${input.question.trim()}`,
    context ? `Contexto editorial fornecido:\n${context}` : "Contexto editorial fornecido: nenhum.",
    "Produza as cinco seções pedidas.",
  ].join("\n\n");
}

// ---------------------------------------------------------------------------
// Provedor de DEMONSTRAÇÃO (usado quando não há CEREBRAS_API_KEY configurada)
// ---------------------------------------------------------------------------

class DemoProvider implements AiAnalysisProvider {
  readonly name = "demo";
  readonly model = "demo-local-deterministic";
  readonly demo = true;

  async generateAnalysis(input: GenerateAnalysisInput): Promise<GenerateAnalysisResult> {
    const q = input.question.trim();
    const analysis: AnalysisSections = {
      scenarioAnalysis: `[MODO DEMONSTRAÇÃO — nenhuma chamada externa de IA foi feita] Sobre "${q}": esta resposta é gerada localmente para testar o fluxo completo do produto. Em produção, esta seção descreveria os fatos verificáveis e o estado atual do tema, separando o que já aconteceu do que ainda é interpretação. Como não há contexto editorial acoplado nesta execução, qualquer leitura factual aqui seria insuficiente.`,
      projection: `[DEMONSTRAÇÃO] Uma projeção real partiria dos fatos acima e indicaria caminhos plausíveis, sempre em linguagem condicional. Neste modo de teste, nenhuma projeção sobre "${q}" deve ser considerada informativa.`,
      consequences: `[DEMONSTRAÇÃO] Aqui apareceriam os desdobramentos possíveis para atores políticos, agenda do Congresso, calendário eleitoral e percepção pública — cada um marcado como possibilidade, não como certeza.`,
      mostLikelyScenario: `[DEMONSTRAÇÃO] Esta seção apontaria o cenário de maior probabilidade relativa e explicaria por que ele é o mais provável, reconhecendo o grau de incerteza envolvido.`,
      changeFactors: `[DEMONSTRAÇÃO] Fatores capazes de alterar a projeção: decisões judiciais, mudanças de aliança, indicadores econômicos, novas pesquisas e fatos imprevistos. Em modo demonstração não há dados reais que sustentem qualquer estimativa.`,
    };
    const joined = Object.values(analysis).join(" ");
    return {
      analysis,
      usage: estimateUsage(SYSTEM_PROMPT + buildUserPrompt(input), joined),
      provider: this.name,
      model: this.model,
      demo: true,
    };
  }
}

// ---------------------------------------------------------------------------
// Adaptador Cerebras (API compatível com chat completions no estilo OpenAI)
// ---------------------------------------------------------------------------

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "scenarioAnalysis",
    "projection",
    "consequences",
    "mostLikelyScenario",
    "changeFactors",
  ],
  properties: {
    scenarioAnalysis: { type: "string" },
    projection: { type: "string" },
    consequences: { type: "string" },
    mostLikelyScenario: { type: "string" },
    changeFactors: { type: "string" },
  },
} as const;

type ChatCompletion = {
  choices?: { message?: { content?: string } }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    completion_tokens_details?: { reasoning_tokens?: number };
  };
};

class CerebrasProvider implements AiAnalysisProvider {
  readonly name = "cerebras";
  readonly demo = false;

  constructor(
    private readonly apiKey: string,
    readonly model: string,
    private readonly baseUrl: string,
  ) {}

  async generateAnalysis(input: GenerateAnalysisInput): Promise<GenerateAnalysisResult> {
    const userPrompt = buildUserPrompt(input);
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.4,
        max_tokens: 1600,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "political_analysis", strict: true, schema: RESPONSE_SCHEMA },
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        `Provedor de IA respondeu ${response.status}: ${detail.slice(0, 300) || "sem detalhes"}`,
      );
    }

    const payload = (await response.json()) as ChatCompletion;
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("Provedor de IA retornou uma resposta vazia.");

    const analysis = parseSections(content);
    const u = payload.usage;
    const usage: TokenUsage =
      u && typeof u.prompt_tokens === "number" && typeof u.completion_tokens === "number"
        ? {
            inputTokens: u.prompt_tokens,
            outputTokens: u.completion_tokens,
            reasoningTokens: u.completion_tokens_details?.reasoning_tokens ?? 0,
            totalTokens: u.total_tokens ?? u.prompt_tokens + u.completion_tokens,
            estimated: false,
          }
        : estimateUsage(SYSTEM_PROMPT + userPrompt, content);

    return { analysis, usage, provider: this.name, model: this.model, demo: false };
  }
}

function parseSections(content: string): AnalysisSections {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    throw new Error("Não foi possível interpretar a resposta estruturada da IA.");
  }
  const pick = (key: keyof AnalysisSections) => {
    const value = raw[key];
    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`Resposta da IA sem a seção obrigatória "${key}".`);
    }
    return value.trim();
  };
  return {
    scenarioAnalysis: pick("scenarioAnalysis"),
    projection: pick("projection"),
    consequences: pick("consequences"),
    mostLikelyScenario: pick("mostLikelyScenario"),
    changeFactors: pick("changeFactors"),
  };
}

/**
 * Seleciona o provedor. Sem CEREBRAS_API_KEY o app NÃO quebra:
 * cai automaticamente no modo demonstração.
 */
export function getAnalysisProvider(): AiAnalysisProvider {
  const apiKey = process.env["CEREBRAS_API_KEY"];
  if (!apiKey) return new DemoProvider();
  const model = process.env["CEREBRAS_MODEL"] || "gpt-oss-120b";
  const baseUrl = process.env["CEREBRAS_BASE_URL"] || "https://api.cerebras.ai/v1";
  return new CerebrasProvider(apiKey, model, baseUrl);
}

export function getProviderStatus(): { configured: boolean; provider: string; model: string } {
  const provider = getAnalysisProvider();
  return { configured: !provider.demo, provider: provider.name, model: provider.model };
}

export { CREDIT_CONFIG };
