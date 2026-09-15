import { createFileRoute } from "@tanstack/react-router";
import { Check, ChevronRight, Copy, Download, Image as ImageIcon, Library, Lock, Plus, RotateCcw, Save, Sparkles, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/charges")({ component: ChargesStudio });

type Stage = "PAUTA" | "CONCEITO" | "FRASE" | "STORYBOARD" | "PROMPT" | "GERAÇÃO" | "VALIDAÇÃO" | "APROVADA";
type ChargeType = "IMPACTO" | "IRONIA" | "ESTRATÉGIA" | "CONFRONTO" | "PROVOCAÇÃO";
type CheckState = { identity: boolean; continuity: boolean; factual: boolean; format: boolean };
type Scene = { id: number; label: string; duration: string; action: string; camera: string; prompt: string };
type Brief = { headline: string; facts: string; whyItMatters: string; characters: string; sources: string; type: ChargeType };
type SavedCharge = Brief & { id: string; createdAt: string; stage: Stage; concept: string; phrase: string; masterPrompt: string; scenes: Scene[]; checks: CheckState };

const stages: Stage[] = ["PAUTA", "CONCEITO", "FRASE", "STORYBOARD", "PROMPT", "GERAÇÃO", "VALIDAÇÃO", "APROVADA"];
const types: ChargeType[] = ["IMPACTO", "IRONIA", "ESTRATÉGIA", "CONFRONTO", "PROVOCAÇÃO"];
const emptyBrief: Brief = { headline: "", facts: "", whyItMatters: "", characters: "", sources: "", type: "IMPACTO" };
const storageKey = "politica-x-minutos:charge-factory:v1";

function conceptFor(b: Brief) {
  const people = b.characters || "os personagens envolvidos";
  const subject = b.headline || "a pauta selecionada";
  return {
    IMPACTO: `Representar a consequência central de ${subject}, colocando ${people} diante do resultado da decisão.`,
    IRONIA: `Criar um contraste visual em que ${people} encaram uma consequência irônica diretamente ligada a ${subject}.`,
    ESTRATÉGIA: `Transformar ${subject} em um jogo de estratégia, mostrando ${people} tomando posições e calculando o próximo movimento.`,
    CONFRONTO: `Colocar ${people} em oposição visual clara, usando ${subject} como elemento central do conflito.`,
    PROVOCAÇÃO: `Criar uma metáfora visual forte sobre ${subject}, com ${people} em uma situação que provoque curiosidade sem inventar fatos.`,
  }[b.type];
}

function phraseFor(b: Brief) {
  const options: Record<ChargeType, string[]> = {
    IMPACTO: ["Agora apertou.", "A conta chegou.", "O efeito veio."],
    IRONIA: ["Que coincidência.", "Tudo sob controle.", "Era só o começo."],
    ESTRATÉGIA: ["Hora de recalcular.", "Próximo movimento.", "Jogo virou."],
    CONFRONTO: ["Quem manda agora?", "Ninguém recua.", "É guerra política."],
    PROVOCAÇÃO: ["E agora?", "Quem paga a conta?", "Tem algo aí."],
  };
  return options[b.type][0];
}

function scenesFor(b: Brief, concept: string, phrase: string): Scene[] {
  const base = `EDITORIAL POLITICAL CARICATURE. VERTICAL 9:16. Detailed caricature face, expressive cartoon editorial body, polished newsroom illustration, controlled color accents. CHARACTERS: ${b.characters || "characters defined by the verified brief"}. SUBJECT: ${b.headline || "verified political topic"}. CONCEPT: ${concept}. IDENTITY LOCK: preserve supplied facial references, recognizable traits, body proportions, wardrobe logic and recurring identifiers in every scene. CONTINUITY LOCK: same environment, lighting direction, costume and character scale across all scenes. FACTUAL RULE: depict only supplied verified facts; symbolic objects are editorial metaphors, never fabricated evidence. No watermark, malformed text, duplicated characters or random text.`;
  return [
    { id: 1, label: "GANCHO", duration: "0–3s", action: `Introduzir ${b.headline || "a pauta"} com ${b.characters || "os personagens"} e um símbolo visual único.`, camera: "Plano médio + aproximação suave.", prompt: `${base} SCENE 01 — HOOK. Establish the characters and the central visual conflict immediately. CAMERA: medium shot, subtle push-in.` },
    { id: 2, label: "CONFLITO", duration: "3–8s", action: "Mostrar a ação central da metáfora e deixar o conflito visual inequívoco.", camera: "Plano aberto para revelar a metáfora.", prompt: `${base} SCENE 02 — CONFLICT. Show the central editorial metaphor from the concept. CAMERA: wider composition with clear foreground/background depth.` },
    { id: 3, label: "REAÇÃO", duration: "8–13s", action: "Destacar a reação do protagonista e a consequência visual do conflito.", camera: "Close editorial no protagonista.", prompt: `${base} SCENE 03 — REACTION. Emphasize the protagonist's expressive reaction while retaining the same setting and wardrobe. CAMERA: editorial close-up.` },
    { id: 4, label: "FECHAMENTO", duration: "13–18s", action: `Resolver a metáfora e deixar espaço para a frase-charge “${phrase}”.`, camera: "Plano hero estável com espaço negativo.", prompt: `${base} SCENE 04 — PAYOFF. Resolve the metaphor in one strong final frame. Leave clean negative space for the external caption “${phrase}”; do not render text inside the image. CAMERA: stable hero frame.` },
  ];
}

function masterFor(b: Brief, concept: string, phrase: string) {
  return ["EDITORIAL POLITICAL CARICATURE — MASTER STYLE LOCK", "FORMAT: vertical 9:16; short-form animation ready.", "STYLE: detailed editorial caricature face + expressive cartoon editorial body + polished newsroom illustration + controlled color accents.", `CHARACTERS: ${b.characters || "defined by verified brief"}.`, "IDENTITY LOCK: same facial structure, recognizable traits, body proportions, wardrobe logic and recurring identifiers in every scene.", `SUBJECT: ${b.headline || "verified political topic"}.`, `FACTUAL BASIS: ${b.facts || "only verified facts supplied by the editorial pipeline"}.`, `WHY IT MATTERS: ${b.whyItMatters || "derive context only from the verified brief"}.`, `VISUAL CONCEPT: ${concept}`, `CHARGE PHRASE: ${phrase}`, `SOURCES: ${b.sources || "attach verified sources before publication"}.`, "NEGATIVE RULES: no invented facts, quotes, documents or unsupported actions; no identity drift; no extra characters; no malformed hands/faces; no watermark; no random text.", "CONTINUITY: preserve environment, lighting, costume, character scale and palette across scenes."].join("\n");
}

function newId() { return `CH-${Date.now().toString(36).toUpperCase()}`; }
function download(name: string, text: string) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "application/json" })); a.download = name; a.click(); URL.revokeObjectURL(a.href); }

function ChargesStudio() {
  const [brief, setBrief] = useState<Brief>(emptyBrief);
  const [stage, setStage] = useState<Stage>("PAUTA");
  const [checks, setChecks] = useState<CheckState>({ identity: false, continuity: false, factual: false, format: false });
  const [saved, setSaved] = useState<SavedCharge[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { try { setSaved(JSON.parse(localStorage.getItem(storageKey) || "[]")); } catch { setSaved([]); } }, []);
  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(saved)); }, [saved]);

  const concept = useMemo(() => conceptFor(brief), [brief]);
  const phrase = useMemo(() => phraseFor(brief), [brief]);
  const scenes = useMemo(() => scenesFor(brief, concept, phrase), [brief, concept, phrase]);
  const masterPrompt = useMemo(() => masterFor(brief, concept, phrase), [brief, concept, phrase]);
  const index = stages.indexOf(stage);
  const ready = Object.values(checks).every(Boolean);

  const update = (key: keyof Brief, value: string) => setBrief((b) => ({ ...b, [key]: value }));
  const save = () => {
    if (!brief.headline.trim()) return;
    const item: SavedCharge = { ...brief, id: activeId || newId(), createdAt: new Date().toISOString(), stage, concept, phrase, masterPrompt, scenes, checks };
    setSaved((items) => [item, ...items.filter((x) => x.id !== item.id)]);
    setActiveId(item.id);
  };
  const load = (item: SavedCharge) => { setBrief({ headline: item.headline, facts: item.facts, whyItMatters: item.whyItMatters, characters: item.characters, sources: item.sources, type: item.type }); setStage(item.stage); setChecks(item.checks); setActiveId(item.id); };
  const reset = () => { setBrief(emptyBrief); setStage("PAUTA"); setChecks({ identity: false, continuity: false, factual: false, format: false }); setActiveId(null); setCopied(false); };
  const advance = () => { if (stage === "VALIDAÇÃO" && !ready) return; setStage(stages[Math.min(index + 1, stages.length - 1)]); };
  const copy = async () => { try { await navigator.clipboard.writeText(masterPrompt); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch {} };

  return <div className="min-h-screen bg-background px-6 py-8 text-foreground"><div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm md:flex-row md:items-center md:justify-between"><div><div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-primary"><Sparkles size={15}/> POLÍTICA EM X MINUTOS</div><h1 className="text-3xl font-black">Fábrica de Charges</h1><p className="mt-1 max-w-3xl text-sm text-muted-foreground">Pipeline editorial completo para transformar pautas verificadas em sequências de charges prontas para produção.</p></div><div className="flex gap-2"><button onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-bold hover:bg-muted"><Plus size={16}/> Nova</button><button onClick={save} disabled={!brief.headline} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-40"><Save size={16}/> Salvar</button></div></header>

    <section className="rounded-2xl border border-border bg-card p-4"><div className="grid gap-2 md:grid-cols-8">{stages.map((s, i) => <button key={s} onClick={() => setStage(s)} className={`rounded-xl px-2 py-3 text-[10px] font-black tracking-wider ${s === stage ? "bg-primary text-primary-foreground" : i < index ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}><span className="mb-1 block">{i < index ? <Check className="mx-auto" size={14}/> : i + 1}</span>{s}</button>)}</div></section>

    <div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]"><section className="space-y-4 rounded-2xl border border-border bg-card p-6"><div><h2 className="text-lg font-black">01 · Pauta de entrada</h2><p className="text-sm text-muted-foreground">A estrutura já aceita a pauta que futuramente virá do Make.</p></div><input value={brief.headline} onChange={(e)=>update("headline",e.target.value)} placeholder="Manchete da pauta" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"/><textarea value={brief.facts} onChange={(e)=>update("facts",e.target.value)} placeholder="O que aconteceu? Somente fatos verificados." className="min-h-24 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"/><textarea value={brief.whyItMatters} onChange={(e)=>update("whyItMatters",e.target.value)} placeholder="Por que isso importa?" className="min-h-20 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"/><input value={brief.characters} onChange={(e)=>update("characters",e.target.value)} placeholder="Personagens envolvidos" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"/><input value={brief.sources} onChange={(e)=>update("sources",e.target.value)} placeholder="Fontes verificadas" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"/><div><label className="mb-2 block text-xs font-black tracking-wider text-muted-foreground">TIPO DA CHARGE</label><div className="flex flex-wrap gap-2">{types.map((t)=><button key={t} onClick={()=>update("type",t)} className={`rounded-full px-3 py-2 text-xs font-black ${brief.type===t?"bg-primary text-primary-foreground":"bg-muted text-muted-foreground"}`}>{t}</button>)}</div></div></section>

    <section className="space-y-4 rounded-2xl border border-border bg-card p-6"><div><h2 className="text-lg font-black">02 · Direção editorial</h2><p className="text-sm text-muted-foreground">A IA define a metáfora antes da geração visual.</p></div><div className="rounded-xl bg-muted/60 p-4"><span className="text-[10px] font-black tracking-widest text-muted-foreground">CONCEITO</span><p className="mt-2 text-sm leading-6">{concept}</p></div><div className="rounded-xl border border-primary/20 bg-primary/5 p-4"><span className="text-[10px] font-black tracking-widest text-primary">FRASE-CHARGE</span><p className="mt-2 text-2xl font-black">“{phrase}”</p></div><div className="rounded-xl bg-muted/60 p-4 text-sm"><div className="flex items-center gap-2 font-bold"><Lock size={15} className="text-primary"/> Identity Lock ativo</div><p className="mt-2 text-muted-foreground">O mesmo padrão de personagem, roupa, escala, cenário e iluminação acompanha as quatro cenas.</p></div></section></div>

    <section className="rounded-2xl border border-border bg-card p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-black">03 · Fábrica de cenas</h2><p className="text-sm text-muted-foreground">Quatro cenas encadeadas, cada uma com prompt próprio.</p></div><ImageIcon size={20} className="text-primary"/></div><div className="grid gap-4 md:grid-cols-2">{scenes.map((s)=><article key={s.id} className="rounded-2xl border border-border bg-background p-5"><div className="flex items-center justify-between"><span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black text-primary">CENA {String(s.id).padStart(2,"0")}</span><span className="text-xs font-bold text-muted-foreground">{s.duration}</span></div><h3 className="mt-4 font-black">{s.label}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{s.action}</p><div className="mt-3 rounded-xl bg-muted p-3 text-xs"><b>Câmera:</b> {s.camera}</div><details className="mt-3"><summary className="cursor-pointer text-xs font-black text-primary">Ver prompt</summary><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-muted p-3 text-[11px] leading-5">{s.prompt}</pre></details></article>)}</div></section>

    <section className="rounded-2xl border border-border bg-card p-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-black">04 · Master Prompt</h2><p className="text-sm text-muted-foreground">Use este prompt como padrão do motor de geração visual.</p></div><button onClick={copy} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-bold">{copied?<Check size={15}/>:<Copy size={15}/>} {copied?"Copiado":"Copiar"}</button></div><pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-muted p-4 text-xs leading-5">{masterPrompt}</pre></section>

    <section className="rounded-2xl border border-border bg-card p-6"><div className="mb-4"><h2 className="text-lg font-black">05 · Validação obrigatória</h2><p className="text-sm text-muted-foreground">A charge só pode chegar a APROVADA depois dos quatro checks.</p></div><div className="grid gap-3 md:grid-cols-4">{([ ["identity","Identidade dos personagens"],["continuity","Continuidade entre cenas"],["factual","Coerência factual"],["format","Formato 9:16"]] as const).map(([key,label])=><button key={key} onClick={()=>setChecks(c=>({...c,[key]:!c[key]}))} className={`flex items-center gap-3 rounded-xl border p-4 text-left text-sm font-bold ${checks[key]?"border-primary bg-primary/10":"border-border"}`}><span className={`flex h-6 w-6 items-center justify-center rounded-full border ${checks[key]?"border-primary bg-primary text-primary-foreground":"border-border"}`}>{checks[key]&&<Check size={14}/>}</span>{label}</button>)}</div></section>

    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-black tracking-widest text-muted-foreground">ETAPA ATUAL</p><h2 className="mt-1 text-xl font-black">{stage}</h2><p className="text-sm text-muted-foreground">{stage === "VALIDAÇÃO" && !ready ? "Complete os 4 checks para aprovar." : "Pipeline pronto para avançar."}</p></div><div className="flex gap-2"><button onClick={()=>download(`${activeId||"charge"}.json`,JSON.stringify({id:activeId||newId(),brief,stage,concept,phrase,masterPrompt,scenes,checks},null,2))} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold"><Download size={16}/> Exportar</button><button onClick={save} disabled={!brief.headline} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold disabled:opacity-40"><Save size={16}/> Salvar</button><button onClick={advance} disabled={!brief.headline || stage === "APROVADA" || (stage === "VALIDAÇÃO" && !ready)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground disabled:opacity-40">{stage === "APROVADA" ? "Charge aprovada" : "Avançar"}<ChevronRight size={17}/></button></div></section>

    <section className="rounded-2xl border border-border bg-card p-6"><div className="mb-4 flex items-center gap-2"><Library size={19} className="text-primary"/><div><h2 className="text-lg font-black">Biblioteca de Charges</h2><p className="text-sm text-muted-foreground">Charges salvas neste navegador. A estrutura está pronta para trocar por banco persistente depois.</p></div></div>{saved.length===0?<div className="rounded-xl bg-muted p-6 text-center text-sm text-muted-foreground">Nenhuma charge salva ainda.</div>:<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{saved.map(item=><button key={item.id} onClick={()=>load(item)} className={`rounded-xl border p-4 text-left hover:bg-muted ${activeId===item.id?"border-primary":"border-border"}`}><div className="flex items-center justify-between"><span className="text-[10px] font-black text-primary">{item.id}</span><span className="text-[10px] font-bold text-muted-foreground">{item.stage}</span></div><p className="mt-2 font-bold">{item.headline}</p><p className="mt-1 text-xs text-muted-foreground">{item.type} · {new Date(item.createdAt).toLocaleString("pt-BR")}</p></button>)}</div>}</section>
  </div></div>;
}
