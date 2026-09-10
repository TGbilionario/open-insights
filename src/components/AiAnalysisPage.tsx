import "@/ai-analysis.css";
import { AlertTriangle, Coins, Loader2, RefreshCw, Sparkles, Target, Wand2, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  getAiAnalysisHistory,
  getAiAnalysisState,
  runAiAnalysis,
  type AiStateDTO,
  type AnalysisRecordDTO,
} from "@/lib/ai-analysis.functions";

function getUserKey(): string {
  if (typeof window === "undefined") return "server-placeholder";
  const existing = localStorage.getItem("pxm-ai-user-key");
  if (existing) return existing;
  const key = crypto.randomUUID();
  localStorage.setItem("pxm-ai-user-key", key);
  return key;
}

const SECTIONS: [keyof AnalysisRecordDTO["sections"], string, string][] = [
  ["scenarioAnalysis", "🧠", "O que a IA acha?"],
  ["projection", "🔮", "O que pode acontecer?"],
  ["consequences", "⚡", "Quais podem ser as consequências?"],
  ["mostLikelyScenario", "🎯", "Qual cenário parece mais provável?"],
  ["changeFactors", "🔄", "O que poderia mudar tudo?"],
];

export function AiAnalysisPage() {
  const [userKey, setUserKey] = useState("");
  const [state, setState] = useState<AiStateDTO | null>(null);
  const [history, setHistory] = useState<AnalysisRecordDTO[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisRecordDTO | null>(null);
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const resultRef = useRef<HTMLElement | null>(null);

  useEffect(() => { setUserKey(getUserKey()); }, []);

  useEffect(() => {
    if (!userKey) return;
    void getAiAnalysisState({ data: { userKey } }).then(setState).catch(() => undefined);
    void getAiAnalysisHistory({ data: { userKey } }).then(setHistory).catch(() => undefined);
  }, [userKey]);

  const freeLeft = state ? Math.max(state.freeUsesLimit - state.freeUsesUsed, 0) : 0;
  const canUseCommunity = !!state && freeLeft > 0 && state.communityRemaining >= state.reservationCredits;
  const canUsePersonal = !!state && state.personalBalance >= state.reservationCredits;
  const hasValidQuestion = question.trim().length >= 10;
  const canSubmit = !!state && (state.testMode || canUseCommunity || canUsePersonal);
  const canAttempt = !!state && hasValidQuestion && !loading;

  const renewalLabel = useMemo(() => {
    if (!state) return "";
    return new Date(state.resetAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }, [state]);

  const submit = async () => {
    if (!userKey || loading || !hasValidQuestion) return;
    setLoading(true); setError(""); setBlocked(""); setResult(null); setShowSuccess(false);
    try {
      const response = await runAiAnalysis({ data: { userKey, question } });
      setState(response.state);
      if (response.ok) {
        setResult(response.record);
        setHistory((h) => [response.record, ...h].slice(0, 10));
        setQuestion("");
        setShowSuccess(true);
        window.setTimeout(() => setShowSuccess(false), 3200);
        window.setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 120);
      } else if (response.reason === "credits_exhausted") {
        setBlocked(response.message);
      } else {
        setError(response.message);
      }
    } catch {
      setError("Não conseguimos falar com o servidor. Tente novamente em instantes.");
    } finally {
      setLoading(false);
    }
  };

  return <div className="pxm-page pxm-ai">
    <div className="pxm-page-head pxm-ai-intro">
      <div className="pxm-ai-tool-title">
        <span className="pxm-ai-tool-kicker">EXPERIÊNCIA DE INTELIGÊNCIA ARTIFICIAL</span>
        <h1>ANÁLISE E SUPOSIÇÃO DA AI</h1>
        <div className="pxm-ai-title-line" aria-hidden="true" />
      </div>
      <h2>Veja como uma inteligência artificial analisa a situação, imagina possíveis desdobramentos e aponta quais consequências podem surgir.</h2>
      <p>É uma experiência para explorar possibilidades: você apresenta um acontecimento ou cenário e pergunta, como faria a um amigo extremamente inteligente: <strong>“Isso aconteceu. E agora? O que você acha que vai acontecer?”</strong></p>
      <div className="pxm-ai-intro-chips" aria-label="Como funciona">
        <span>🧠 Analisa</span><span>🔮 Imagina</span><span>⚡ Aponta consequências</span>
      </div>
    </div>

    {state?.testMode && <div className="pxm-ai-demo"><Wand2 size={16}/><div><b>Modo de teste administrativo ativo</b><span>As chamadas reais à IA estão liberadas para testes sem descontar créditos da comunidade ou créditos pessoais. Desative este modo antes de abrir o recurso ao público.</span></div></div>}
    {state?.demoMode && !state.testMode && <div className="pxm-ai-demo"><Wand2 size={16}/><div><b>Modo demonstração ativo</b><span>Nenhuma requisição externa de IA é feita. As respostas são geradas localmente apenas para testar o fluxo completo de créditos e histórico.</span></div></div>}

    <div className="pxm-ai-credits">
      <div className="pxm-ai-credit-card"><span>CRÉDITOS DA COMUNIDADE</span><strong>{state ? state.communityRemaining.toLocaleString("pt-BR") : "—"}</strong><small>de {state ? state.communityDailyLimit.toLocaleString("pt-BR") : "—"} por dia · valor provisório</small></div>
      <div className="pxm-ai-credit-card"><span>SEUS CRÉDITOS PESSOAIS</span><strong>{state ? state.personalBalance.toLocaleString("pt-BR") : "—"}</strong><small>sem limite de usos diários</small></div>
      <div className="pxm-ai-credit-card"><span>USOS GRATUITOS DE HOJE</span><strong>{state ? `${freeLeft} / ${state.freeUsesLimit}` : "—"}</strong><small>renova em {renewalLabel || "—"}</small></div>
    </div>

    <section className={`pxm-ai-ask ${loading ? "pxm-ai-ask-loading" : ""}`}>
      <label htmlFor="pxm-ai-question">Cenário ou acontecimento</label>
      <textarea id="pxm-ai-question" value={question} onChange={(e) => setQuestion(e.target.value)} rows={4}
        placeholder='Ex.: o Congresso aprovou uma mudança nas regras eleitorais. Beleza... isso aconteceu. E agora? O que você acha que pode acontecer?' maxLength={2000} disabled={loading}/>

      {loading && <div className="pxm-ai-live-loading" role="status" aria-live="polite">
        <div className="pxm-ai-live-icon"><Loader2 size={22} className="pxm-spin"/></div>
        <div className="pxm-ai-live-copy">
          <strong>A IA está analisando o cenário</strong>
          <span>Estamos cruzando a pergunta com as informações disponíveis e construindo possibilidades. Isso pode levar alguns segundos.</span>
          <div className="pxm-ai-live-steps"><span className="is-active">Analisando</span><span>Imaginando cenários</span><span>Organizando consequências</span></div>
        </div>
      </div>}

      <div className="pxm-ai-ask-foot">
        <small>{question.length}/2000 · reserva de {state?.reservationCredits ?? "—"} créditos por análise (provisório)</small>
        <button className="pxm-primary" onClick={() => void submit()} disabled={!canAttempt}>
          {loading ? <><Loader2 size={16} className="pxm-spin"/> Analisando...</> : showSuccess ? <><Target size={16}/> Análise concluída</> : <><Sparkles size={16}/> Gerar análise</>}
        </button>
      </div>

      {!canSubmit && state && (freeLeft > 0 ? state.communityRemaining < state.reservationCredits : true) && <div className="pxm-ai-blocked">
        <b><AlertTriangle size={16}/> CRÉDITOS GRATUITOS ESGOTADOS</b>
        <p>{freeLeft > 0
          ? "Os créditos da comunidade foram consumidos por outros usuários neste ciclo."
          : "Você já usou seus 2 usos gratuitos deste ciclo e não tem créditos pessoais suficientes."}</p>
        <ul>
          <li>Próxima renovação: <b>{renewalLabel}</b></li>
          <li>Próxima alocação da comunidade: <b>{state.communityDailyLimit.toLocaleString("pt-BR")} créditos</b> (provisório)</li>
          <li>Seus créditos pessoais: <b>{state.personalBalance.toLocaleString("pt-BR")}</b></li>
        </ul>
        <div className="pxm-ai-blocked-actions">
          <button className="pxm-primary" onClick={() => document.getElementById("pxm-ai-question")?.focus()}><Coins size={15}/> Desbloquear com créditos</button>
          <button className="pxm-ghost" disabled><RefreshCw size={15}/> Aguardar renovação</button>
        </div>
      </div>}

      {blocked && <div className="pxm-ai-note pxm-ai-note-warn"><AlertTriangle size={15}/> {blocked}</div>}
      {error && <div className="pxm-ai-note pxm-ai-note-warn"><AlertTriangle size={15}/> {error} <button className="pxm-text-btn" onClick={() => void submit()}>Tentar de novo</button></div>}
    </section>

    {showSuccess && result && <div className="pxm-ai-success" role="status"><div className="pxm-ai-success-icon">✓</div><div><strong>ANÁLISE CONCLUÍDA</strong><span>Seu resultado está logo abaixo. Você já pode ler os 5 cenários da análise.</span></div><button className="pxm-ai-success-link" onClick={() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>Ver resultado ↓</button></div>}

    {result && <section ref={resultRef} className="pxm-ai-result pxm-ai-result-ready">
      <div className="pxm-section-head"><div><span>RESULTADO</span><h2>{result.question}</h2></div></div>
      <div className="pxm-ai-warning">
        <AlertTriangle size={16}/>
        <div>
          <b className="pxm-ai-hypothesis-badge">HIPÓTESES / SUPOSIÇÕES</b>
          <p>Esta análise é uma exploração de possibilidades criada pela inteligência artificial. Ela pode combinar informações disponíveis com inferências e projeções; por isso, não deve ser tratada como certeza sobre o que irá acontecer. Novos acontecimentos podem mudar completamente um cenário.</p>
        </div>
      </div>
      <div className="pxm-ai-sections">
        {SECTIONS.map(([key, icon, label]) => <article key={key} className="pxm-ai-section-card">
          <h3><i>{icon}</i> {label}</h3><p>{result.sections[key]}</p>
        </article>)}
      </div>

      <section className="pxm-ai-sources">
        <div className="pxm-section-head"><div><span>RASTREABILIDADE</span><h3>Fontes consultadas</h3></div></div>
        {result.verificationStatus === "no_sources" ? (
          <p className="pxm-ai-source-empty">Nenhuma fonte pública foi recuperada. Informações atuais devem ser tratadas como não verificadas.</p>
        ) : (
          <div className="pxm-ai-source-list">
            {result.verificationSources.map((source, index) => (
              <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                <span>{index + 1}</span>
                <div><b>{source.source}</b><strong>{source.title}</strong><small>{source.authority === "official" ? "Fonte oficial" : "Veículo jornalístico"} · {source.sourceType}</small></div>
              </a>
            ))}
          </div>
        )}
      </section>

      <div className="pxm-ai-tech"><Zap size={13}/> {result.provider} · {result.model} · {result.totalTokens} tokens · {result.creditsCharged} créditos ({result.creditSource === "community" ? "comunidade" : "pessoais"})</div>
    </section>}

    {history.length > 0 && <section className="pxm-ai-history">
      <div className="pxm-section-head"><div><span>HISTÓRICO</span><h2>Suas análises recentes</h2></div></div>
      <div className="pxm-history-list">{history.map((h) => <button key={h.id} onClick={() => setResult(h)}>
        <span>{new Date(h.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
        <b>{h.question}</b><Target size={15}/>
      </button>)}</div>
    </section>}

    <div className="pxm-note"><AlertTriangle size={18}/><div><b>Explore possibilidades</b><p>A ferramenta foi criada para imaginar desdobramentos e cenários. Use a análise como uma forma de pensar sobre o que pode acontecer, não como uma previsão garantida.</p></div></div>
  </div>;
}
