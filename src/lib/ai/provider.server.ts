import {
  collectVerificationSources,
  formatVerificationSources,
  type VerificationSource,
} from "./source-verification.server";

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
  verificationSources?: string | undefined;
};

export type GenerateAnalysisResult = {
  analysis: AnalysisSections;
  usage: TokenUsage;
  provider: string;
  model: string;
  demo: boolean;
  verificationSources: VerificationSource[];
};

export interface AiAnalysisProvider {
  readonly name: string;
  readonly model: string;
  readonly demo: boolean;
  generateAnalysis(input: GenerateAnalysisInput): Promise<GenerateAnalysisResult>;
}

const SYSTEM_PROMPT = `Reasoning: high

Você é o "amigo extremamente inteligente" do microAPP "Política em X Minutos". Atua como um analista político brasileiro curioso, direto e sem arrogância, com foco em eleições, Congresso, partidos, alianças, governo, oposição, Judiciário eleitoral e comportamento do eleitorado.

OBJETIVO
Entregar uma análise útil para quem quer entender o que pode acontecer depois de um acontecimento político. A resposta deve parecer uma conversa com um amigo que entende muito de política: leve, inteligente, condicional e intelectualmente honesta. Não deve parecer um relatório jurídico ou texto genérico de chatbot.

REGRA MÁXIMA — NÃO INVENTAR DADOS
- Nunca invente pesquisas, percentuais, margens de erro, datas, fatos, declarações, decisões, alianças ou resultados eleitorais.
- Nunca transforme uma hipótese em fato.
- Nunca atribua uma probabilidade numérica a um cenário sem dados que sustentem esse número.
- Se não houver dados suficientes para uma estimativa quantitativa, diga explicitamente: "Não há dados suficientes para uma estimativa percentual confiável."
- Se uma informação política atual não puder ser confirmada pelo contexto fornecido, trate-a como "NÃO VERIFICADO" em vez de preencher a lacuna com memória.
- Não cite partidos, cargos ou situações atuais quando houver dúvida sobre sua vigência.
- Não invente fontes. Só mencione fontes quando elas forem fornecidas no contexto.
- Para fatos atuais ou sujeitos a mudança (candidaturas, cargos, partidos, pesquisas, decisões, alianças e números), exija apoio nas fontes de checagem. Se não houver apoio, escreva "NÃO VERIFICADO".
- Uma manchete ou título de fonte é evidência de contexto, não prova suficiente de cada detalhe. Não extrapole além do que a fonte sustenta.
- Priorize fontes classificadas como OFFICIAL para cargos, candidaturas, partidos, decisões e números institucionais.
- Nunca escreva "senador ou deputado", "pode ser", ou equivalentes quando uma fonte oficial fornecida resolve a dúvida. Escolha o dado sustentado pela fonte.
- Não trate a lista de fontes como validação automática: a resposta deve indicar quando um fato não foi suficientemente confirmado.
- Antes de produzir o JSON, faça uma checagem interna de cada afirmação factual e corrija inconsistências óbvias.

SEPARAÇÃO OBRIGATÓRIA
Diferencie sempre:
- FATO: informação apresentada no contexto ou conhecimento claramente estabelecido.
- HIPÓTESE: condição imaginada pela pergunta ou cenário condicional.
- INFERÊNCIA: conclusão lógica derivada dos fatos e hipóteses.
- PROJEÇÃO: possível evolução futura, sempre com linguagem condicional.

TOM E ESTILO
- Seja direto, curioso e leve, como um amigo explicando um cenário político.
- Use "acho que", "parece que", "é provável que", "pode acontecer", "tende a" e expressões equivalentes para deixar claro que são projeções, não certezas.
- Evite jargões desnecessários. Se precisar usar um termo técnico, explique-o rapidamente.
- Evite frases vazias como "isso pode impactar a eleição" sem explicar COMO e POR QUÊ.
- Evite repetir a mesma ideia nas cinco seções.
- Em cada seção, priorize mecanismos concretos e consequências.
- Prefira 3 a 5 parágrafos curtos ou itens curtos por seção, quando isso melhorar a leitura.
- Use português brasileiro natural.
- Não faça propaganda, persuasão partidária, recomendação de voto ou ataque a pessoas/partidos.

ANÁLISE POLÍTICA
Ao avaliar um cenário eleitoral, considere quando forem relevantes:
- transferência e retenção de votos;
- rejeição e capacidade de atração de eleitores moderados;
- efeito sobre esquerda, centro e direita;
- primeiro e segundo turnos;
- alianças partidárias e tempo de campanha;
- capacidade de mobilização e comunicação;
- impacto no Congresso e na governabilidade;
- eventos econômicos, judiciais ou políticos que possam alterar o cenário.

PROJEÇÕES
- Apresente pelo menos um efeito favorável e um efeito adverso quando ambos forem plausíveis.
- Não declare um vencedor ou resultado eleitoral como certo.
- O "cenário mais provável" deve ser uma conclusão condicional, acompanhada dos principais motivos e do que poderia invalidá-la.
- Informe um nível de confiança relativo (ALTA, MÉDIA ou BAIXA) sem inventar percentuais.

FORMATO
Responda SOMENTE com um objeto JSON válido, sem markdown e sem texto antes ou depois, com exatamente estas chaves:
{
  "scenarioAnalysis": "...",
  "projection": "...",
  "consequences": "...",
  "mostLikelyScenario": "...",
  "changeFactors": "..."
}

Cada valor deve ser texto legível. Não repita o título da seção no início do texto — a interface já exibe os títulos. Dentro de cada valor, use marcadores simples com "•" quando houver mais de um ponto.`;

function buildUserPrompt(input: GenerateAnalysisInput): string {
  const context = input.context?.trim();
  return [
    `Pergunta do usuário: ${input.question.trim()}`,
    context ? `Contexto editorial fornecido:\n${context}` : "Contexto editorial fornecido: nenhum.",
    `FONTES PARA CHECAGEM:\n${input.verificationSources?.trim() || "Nenhuma fonte pública recuperada; fatos atuais devem ser marcados como não verificados."}`,
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
      scenarioAnalysis: `[MODO DEMONSTRAÇÃO — nenhuma chamada externa de IA foi feita] Sobre "${q}": aqui a IA contaria o que entende do cenário atual, separando o que é fato do que é interpretação. Como não há contexto editorial acoplado nesta execução, qualquer leitura factual aqui seria incompleta.`,
      projection: `[DEMONSTRAÇÃO] Uma projeção real partiria dos fatos acima e indicaria caminhos plausíveis, sempre em linguagem condicional. Neste modo de teste, nenhuma projeção sobre "${q}" deve ser considerada informativa.`,
      consequences: `[DEMONSTRAÇÃO] Aqui apareceriam os desdobramentos possíveis para atores políticos, agenda do Congresso, calendário eleitoral e percepção pública — cada um marcado como possibilidade, não como certeza.`,
      mostLikelyScenario: `[DEMONSTRAÇÃO] Esta seção apontaria o cenário de maior probabilidade relativa e explicaria por que ele parece o mais provável, reconhecendo o grau de incerteza envolvido.`,
      changeFactors: `[DEMONSTRAÇÃO] Fatores capazes de alterar a projeção: decisões judiciais, mudanças de aliança, indicadores econômicos, novas pesquisas e fatos imprevistos. Em modo demonstração não há dados reais que sustentem qualquer estimativa.`,
    };
    const joined = Object.values(analysis).join(" ");
    return {
      analysis,
      usage: estimateUsage(SYSTEM_PROMPT + buildUserPrompt(input), joined),
      provider: this.name,
      model: this.model,
      demo: true,
      verificationSources: [],
    };
  }
}


type HuggingFaceChatCompletion = {
  choices?: { message?: { content?: string } }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    completion_tokens_details?: { reasoning_tokens?: number };
  };
};

class HuggingFaceProvider implements AiAnalysisProvider {
  readonly name = "huggingface";
  readonly demo = false;

  constructor(
    private readonly apiKey: string,
    readonly model: string,
    private readonly baseUrl: string,
  ) {}

  async generateAnalysis(input: GenerateAnalysisInput): Promise<GenerateAnalysisResult> {
    const sources = await collectVerificationSources(input.question);
    const verificationSources = formatVerificationSources(sources);
    const userPrompt = buildUserPrompt({ ...input, verificationSources });
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
        stream: false,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      if (response.status === 401) throw new Error("Hugging Face: HF_TOKEN inválido ou expirado. Gere um novo token com a permissão \"Make calls to Inference Providers\" e atualize o segredo HF_TOKEN.");
      if (response.status === 403) throw new Error("Hugging Face: HF_TOKEN sem permissão para Inference Providers.");
      if (response.status === 429) throw new Error("Hugging Face: limite temporário de requisições atingido.");
      throw new Error(`Hugging Face respondeu ${response.status}: ${detail.slice(0, 300) || "sem detalhes"}`);
    }

    const payload = (await response.json()) as HuggingFaceChatCompletion;
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("Hugging Face retornou uma resposta vazia.");

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

    return {
      analysis,
      usage,
      provider: this.name,
      model: this.model,
      demo: false,
      verificationSources: sources,
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
    const sources = await collectVerificationSources(input.question);
    const verificationSources = formatVerificationSources(sources);
    const userPrompt = buildUserPrompt({ ...input, verificationSources });
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

    return {
      analysis,
      usage,
      provider: this.name,
      model: this.model,
      demo: false,
      verificationSources: sources,
    };
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
  const hfToken = process.env["HF_TOKEN"];
  if (hfToken) {
    const model = process.env["HF_MODEL"] || "openai/gpt-oss-120b:groq";
    const baseUrl = process.env["HF_BASE_URL"] || "https://router.huggingface.co/v1";
    return new HuggingFaceProvider(hfToken, model, baseUrl);
  }

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
