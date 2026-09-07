import { AlertTriangle, Coins, Loader2, RefreshCw, Sparkles, Target, Wand2, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
  ["scenarioAnalysis", "🔎", "Análise do cenário"],
  ["projection", "🔮", "Suposição / projeção"],
  ["consequences", "⚡", "Possíveis consequências"],
  ["mostLikelyScenario", "🎯", "Cenário mais provável"],
  ["changeFactors", "⚠️", "Fatores que podem mudar a projeção"],
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

  useEffect(() => { setUserKey(getUserKey()); }, []);

  useEffect(() => {
    if (!userKey) return;
    void getAiAnalysisState({ data: { userKey } }).then(setState).catch(() => undefined);
    void getAiAnalysisHistory({ data: { userKey } }).then(setHistory).catch(() => undefined);
  }, [userKey]);

  const freeLeft = state ? Math.max(state.freeUsesLimit - state.freeUsesUsed, 0) : 0;
  const canUseCommunity = !!state && freeLeft > 0 && state.communityRemaining >= state.reservationCredits;
  const canUsePersonal = !!state && state.personalBalance >= state.reservationCredits;
  const canSubmit = canUseCommunity || canUsePersonal;

  const renewalLabel = useMemo(() => {
    if (!state) return "";
    return new Date(state.resetAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }, [state]);

  const submit = async () => {
    if (!userKey || loading || !canSubmit) return;
    setLoading(true); setError(""); setBlocked(""); setResult(null);
    try {
      const response = await runAiAnalysis({ data: { userKey, question } });
      setState(response.state);
      if (response.ok) {
        setResult(response.record);
        setHistory((h) => [response.record, ...h].slice(0, 10));
        setQuestion("");
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
    <div className="pxm-page-head">
      <span>INTELIGÊNCIA ARTIFICIAL</span>
      <h1>Análise e suposição da IA</h1>
      <p>Faça uma pergunta sobre política brasileira e receba um cenário estruturado em cinco partes: o que se sabe, o que pode acontecer e o que pode mudar tudo.</p>
    </div>

    {state?.demoMode && <div className="pxm-ai-demo"><Wand2 size={16}/><div><b>Modo demonstração ativo</b><span>Nenhuma requisição externa de IA é feita. As respostas são geradas localmente apenas para testar o fluxo completo de créditos e histórico.</span></div></div>}

    <div className="pxm-ai-credits">
      <div className="pxm-ai-credit-card"><span>CRÉDITOS DA COMUNIDADE</span><strong>{state ? state.communityRemaining.toLocaleString("pt-BR") : "—"}</strong><small>de {state ? state.communityDailyLimit.toLocaleString("pt-BR") : "—"} por dia · valor provisório</small></div>
      <div className="pxm-ai-credit-card"><span>SEUS CRÉDITOS PESSOAIS</span><strong>{state ? state.personalBalance.toLocaleString("pt-BR") : "—"}</strong><small>sem limite de usos diários</small></div>
      <div className="pxm-ai-credit-card"><span>USOS GRATUITOS DE HOJE</span><strong>{state ? `${freeLeft} / ${state.freeUsesLimit}` : "—"}</strong><small>renova em {renewalLabel || "—"}</small></div>
    </div>

    <section className="pxm-ai-ask">
      <label htmlFor="pxm-ai-question">Sua pergunta</label>
      <textarea id="pxm-ai-question" value={question} onChange={(e) => setQuestion(e.target.value)} rows={4}
        placeholder="Ex.: como a mudança de aliança no Congresso pode afetar a disputa presidencial de 2026?" maxLength={2000}/>
      <div className="pxm-ai-ask-foot">
        <small>{question.length}/2000 · reserva de {state?.reservationCredits ?? "—"} créditos por análise (provisório)</small>
        <button className="pxm-primary" onClick={() => void submit()} disabled={loading || !canSubmit || question.trim().length < 10}>
          {loading ? <><Loader2 size={16} className="pxm-spin"/> Analisando...</> : <><Sparkles size={16}/> Gerar análise</>}
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
          <button className="pxm-primary" disabled><Coins size={15}/> Comprar créditos (em breve)</button>
          <button className="pxm-ghost" disabled><RefreshCw size={15}/> Aguardar renovação</button>
        </div>
      </div>}

      {blocked && <div className="pxm-ai-note pxm-ai-note-warn"><AlertTriangle size={15}/> {blocked}</div>}
      {error && <div className="pxm-ai-note pxm-ai-note-warn"><AlertTriangle size={15}/> {error} <button className="pxm-text-btn" onClick={() => void submit()}>Tentar de novo</button></div>}
    </section>

    {result && <section className="pxm-ai-result">
      <div className="pxm-section-head"><div><span>RESULTADO</span><h2>{result.question}</h2></div></div>
      <div className="pxm-ai-sections">
        {SECTIONS.map(([key, icon, label]) => <article key={key} className="pxm-ai-section-card">
          <h3><i>{icon}</i> {label}</h3><p>{result.sections[key]}</p>
        </article>)}
      </div>
      <div className="pxm-ai-tech"><Zap size={13}/> {result.provider} · {result.model} · {result.totalTokens} tokens · {result.creditsCharged} créditos ({result.creditSource === "community" ? "comunidade" : "pessoais"})</div>
    </section>}

    {history.length > 0 && <section className="pxm-ai-history">
      <div className="pxm-section-head"><div><span>HISTÓRICO</span><h2>Suas análises recentes</h2></div></div>
      <div className="pxm-history-list">{history.map((h) => <button key={h.id} onClick={() => setResult(h)}>
        <span>{new Date(h.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
        <b>{h.question}</b><Target size={15}/>
      </button>)}</div>
    </section>}

    <div className="pxm-note"><AlertTriangle size={18}/><div><b>Aviso importante</b><p>As projeções são cenários gerados por inteligência artificial a partir da pergunta enviada. Não são garantias, previsões eleitorais nem recomendação de voto. Confira sempre as fontes oficiais.</p></div></div>
  </div>;
}
