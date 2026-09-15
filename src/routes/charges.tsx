import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  ChevronRight,
  Copy,
  Download,
  Image as ImageIcon,
  Library,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/charges")({ component: ChargesStudio });

type Stage = "PAUTA" | "CONCEITO" | "FRASE" | "STORYBOARD" | "PROMPT" | "GERAÇÃO" | "VALIDAÇÃO" | "APROVADA";
type ChargeType = "IMPACTO" | "IRONIA" | "ESTRATÉGIA" | "CONFRONTO" | "PROVOCAÇÃO";
type CheckState = { identity: boolean; continuity: boolean; factual: boolean; format: boolean };
type Scene = { id: number; label: string; duration: string; action: string; camera: string; prompt: string };
type Brief = { headline: string; facts: string; whyItMatters: string; characters: string; sources: string; type: ChargeType };
type SavedCharge = Brief & { id: string; createdAt: string; updatedAt: string; stage: Stage; concept: string; phrase: string; masterPrompt: string; scenes: Scene[]; checks: CheckState };

type ChargeRow = {
  id: string;
  charge_code: string;
  headline: string;
  facts: string;
  why_it_matters: string;
  characters: string;
  sources: string;
  charge_type: ChargeType;
  stage: Stage;
  concept: string;
  phrase: string;
  master_prompt: string;
  scenes: Scene[];
  checks: CheckState;
  created_at: string;
  updated_at: string;
};

const stages: Stage[] = ["PAUTA", "CONCEITO", "FRASE", "STORYBOARD", "PROMPT", "GERAÇÃO", "VALIDAÇÃO", "APROVADA"];
const types: ChargeType[] = ["IMPACTO", "IRONIA", "ESTRATÉGIA", "CONFRONTO", "PROVOCAÇÃO"];
const emptyBrief: Brief = { headline: "", facts: "", whyItMatters: "", characters: "", sources: "", type: "IMPACTO" };

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
  return [
    "EDITORIAL POLITICAL CARICATURE — MASTER STYLE LOCK",
    "FORMAT: vertical 9:16; short-form animation ready.",
    "STYLE: detailed editorial caricature face + expressive cartoon editorial body + polished newsroom illustration + controlled color accents.",
    `CHARACTERS: ${b.characters || "defined by verified brief"}.`,
    "IDENTITY LOCK: same facial structure, recognizable traits, body proportions, wardrobe logic and recurring identifiers in every scene.",
    `SUBJECT: ${b.headline || "verified political topic"}.`,
    `FACTUAL BASIS: ${b.facts || "only verified facts supplied by the editorial pipeline"}.`,
    `WHY IT MATTERS: ${b.whyItMatters || "derive context only from the verified brief"}.`,
    `VISUAL CONCEPT: ${concept}`,
    `CHARGE PHRASE: ${phrase}`,
    `SOURCES: ${b.sources || "attach verified sources before publication"}.`,
    "NEGATIVE RULES: no invented facts, quotes, documents or unsupported actions; no identity drift; no extra characters; no malformed hands/faces; no watermark; no random text.",
    "CONTINUITY: preserve environment, lighting, costume, character scale and palette across scenes.",
  ].join("\n");
}

function newId() { return `CH-${Date.now().toString(36).toUpperCase()}`; }
function rowToCharge(row: ChargeRow): SavedCharge {
  return { id: row.charge_code, createdAt: row.created_at, updatedAt: row.updated_at, headline: row.headline, facts: row.facts, whyItMatters: row.why_it_matters, characters: row.characters, sources: row.sources, type: row.charge_type, stage: row.stage, concept: row.concept, phrase: row.phrase, masterPrompt: row.master_prompt, scenes: row.scenes || [], checks: row.checks || { identity: false, continuity: false, factual: false, format: false } };
}

function ChargesStudio() {
  const [brief, setBrief] = useState<Brief>(emptyBrief);
  const [stage, setStage] = useState<Stage>("PAUTA");
  const [checks, setChecks] = useState<CheckState>({ identity: false, continuity: false, factual: false, format: false });
  const [saved, setSaved] = useState<SavedCharge[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const concept = useMemo(() => conceptFor(brief), [brief]);
  const phrase = useMemo(() => phraseFor(brief), [brief]);
  const scenes = useMemo(() => scenesFor(brief, concept, phrase), [brief, concept, phrase]);
  const masterPrompt = useMemo(() => masterFor(brief, concept, phrase), [brief, concept, phrase]);
  const index = stages.indexOf(stage);
  const ready = Object.values(checks).every(Boolean);

  const loadLibrary = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("editorial_charges").select("*").order("created_at", { ascending: false });
    if (error) setMessage(`Erro ao carregar banco: ${error.message}`);
    else setSaved(((data || []) as ChargeRow[]).map(rowToCharge));
    setLoading(false);
  };

  useEffect(() => { void loadLibrary(); }, []);

  const update = (key: keyof Brief, value: string) => setBrief((b) => ({ ...b, [key]: value }));

  const save = async () => {
    if (!brief.headline.trim()) return;
    setSaving(true);
    setMessage("");
    const chargeCode = activeId || newId();
    const payload = {
      charge_code: chargeCode,
      headline: brief.headline,
      facts: brief.facts,
      why_it_matters: brief.whyItMatters,
      characters: brief.characters,
      sources: brief.sources,
      charge_type: brief.type,
      stage,
      concept,
      phrase,
      master_prompt: masterPrompt,
      scenes,
      checks,
    };
    const { data, error } = await supabase.from("editorial_charges").upsert(payload, { onConflict: "charge_code" }).select().single();
    if (error) setMessage(`Não foi possível salvar: ${error.message}`);
    else {
      setActiveId(chargeCode);
      setMessage("Charge salva no banco real.");
      const row = data as ChargeRow;
      setSaved((items) => [rowToCharge(row), ...items.filter((item) => item.id !== chargeCode)]);
    }
    setSaving(false);
  };

  const load = (item: SavedCharge) => {
    setBrief({ headline: item.headline, facts: item.facts, whyItMatters: item.whyItMatters, characters: item.characters, sources: item.sources, type: item.type });
    setStage(item.stage); setChecks(item.checks); setActiveId(item.id); setMessage(`Charge ${item.id} carregada.`);
  };

  const remove = async (id: string) => {
    setDeleting(id);
    const { error } = await supabase.from("editorial_charges").delete().eq("charge_code", id);
    if (error) setMessage(`Não foi possível excluir: ${error.message}`);
    else { setSaved((items) => items.filter((item) => item.id !== id)); if (activeId === id) reset(); setMessage("Charge excluída do banco."); }
    setDeleting(null);
  };

  const reset = () => { setBrief(emptyBrief); setStage("PAUTA"); setChecks({ identity: false, continuity: false, factual: false, format: false }); setActiveId(null); setCopied(false); };
  const advance = () => { if (stage === "VALIDAÇÃO" && !ready) return; setStage(stages[Math.min(index + 1, stages.length - 1)]); };
  const copy = async () => { try { await navigator.clipboard.writeText(masterPrompt); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch {} };
  const exportCharge = () => download(`${activeId || "charge"}.json`, JSON.stringify({ id: activeId || newId(), brief, stage, concept, phrase, masterPrompt, scenes, checks }, null, 2));
  const toggleCheck = (key: keyof CheckState) => setChecks((c) => ({ ...c, [key]: !c[key] }));

  return <div className="min-h-screen bg-background px-6 py-8 text-foreground"><div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm md:flex-row md:items-center md:justify-between"><div><div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-primary"><Sparkles size={15}/> POLÍTICA EM X MINUTOS</div><h1 className="text-3xl font-black">Fábrica de Charges</h1><p className="mt-1 max-w-3xl text-sm text-muted-foreground">Banco editorial real + pipeline de charges. O conteúdo agora fica salvo no Supabase e pode ser consumido pelas próximas automações.</p></div><div className="flex flex-wrap gap-2"><button onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-bold hover:bg-muted"><Plus size={16}/> Nova</button><button onClick={loadLibrary} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-bold hover:bg-muted"><RefreshCw size={16}/> Atualizar</button><button onClick={save} disabled={!brief.headline || saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-40">{saving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Salvar</button></div></header>

    {message && <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold">{message}</div>}

    <section className="rounded-2xl border border-border bg-card p-4"><div className="grid gap-2 md:grid-cols-8">{stages.map((s, i) => <button key={s} onClick={() => setStage(s)} className={`rounded-xl px-2 py-3 text-[10px] font-black tracking-wider ${s === stage ? "bg-primary text-primary-foreground" : i < index ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}><span className="mb-1 block">{i < index ? <Check className="mx-auto" size={14}/> : i + 1}</span>{s}</button>)}</div></section>

    <div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]"><section className="space-y-4 rounded-2xl border border-border bg-card p-6"><div><h2 className="text-lg font-black">01 · Pauta de entrada</h2><p className="text-sm text-muted-foreground">A estrutura já aceita pautas que futuramente virão do Make.</p></div><input value={brief.headline} onChange={(e)=>update("headline",e.target.value)} placeholder="Manchete da pauta" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"/><textarea value={brief.facts} onChange={(e)=>update("facts",e.target.value)} placeholder="O que aconteceu? Somente fatos verificados." className="min-h-24 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"/><textarea value={brief.whyItMatters} onChange={(e)=>update("whyItMatters",e.target.value)} placeholder="Por que isso importa?" className="min-h-20 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"/><input value={brief.characters} onChange={(e)=>update("characters",e.target.value)} placeholder="Personagens envolvidos" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"/><input value={brief.sources} onChange={(e)=>update("sources",e.target.value)} placeholder="Fontes verificadas" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"/><div><label className="mb-2 block text-xs font-black tracking-wider text-muted-foreground">TIPO DA CHARGE</label><div className="flex flex-wrap gap-2">{types.map((t)=><button key={t} onClick={()=>update("type",t)} className={`rounded-full px-3 py-2 text-xs font-black ${brief.type===t?"bg-primary text-primary-foreground":"bg-muted text-muted-foreground"}`}>{t}</button>)}</div></div></section>

    <section className="space-y-4 rounded-2xl border border-border bg-card p-6"><div><h2 className="text-lg font-black">02 · Direção editorial</h2><p className="text-sm text-muted-foreground">A metáfora é criada antes da geração visual.</p></div><div className="rounded-xl bg-muted/60 p-4"><span className="text-[10px] font-black tracking-widest text-muted-foreground">CONCEITO</span><p className="mt-2 text-sm leading-6">{concept}</p></div><div className="rounded-xl border border-primary/20 bg-primary/5 p-4"><span className="text-[10px] font-black tracking-widest text-primary">FRASE-CHARGE</span><p className="mt-2 text-2xl font-black">“{phrase}”</p></div><div className="rounded-xl bg-muted/60 p-4 text-sm"><div className="flex items-center gap-2 font-bold"><Lock size={15} className="text-primary"/> Identity Lock ativo</div><p className="mt-2 text-muted-foreground">O mesmo padrão de personagem, roupa, escala, cenário e iluminação acompanha as quatro cenas.</p></div></section></div>

    <section className="rounded-2xl border border-border bg-card p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-black">03 · Fábrica de cenas</h2><p className="text-sm text-muted-foreground">Quatro cenas encadeadas, cada uma com prompt próprio.</p></div><ImageIcon size={20} className="text-primary"/></div><div className="grid gap-4 md:grid-cols-2">{scenes.map((s)=><article key={s.id} className="rounded-2xl border border-border bg-background p-5"><div className="flex items-center justify-between"><span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black text-primary">CENA {String(s.id).padStart(2,"0")}</span><span className="text-xs font-bold text-muted-foreground">{s.duration}</span></div><h3 className="mt-4 font-black">{s.label}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{s.action}</p><div className="mt-3 rounded-xl bg-muted p-3 text-xs"><b>Câmera:</b> {s.camera}</div><div className="mt-3 rounded-xl border border-border p-3 text-xs leading-5 text-muted-foreground">{s.prompt}</div></article>)}</div></section>

    <section className="grid gap-6 lg:grid-cols-[1fr_.9fr]"><div className="rounded-2xl border border-border bg-card p-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-black">04 · Master Prompt</h2><p className="text-sm text-muted-foreground">Pronto para o futuro motor de geração.</p></div><button onClick={copy} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:bg-muted"><Copy size={14}/>{copied ? "Copiado" : "Copiar"}</button></div><pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-muted p-4 text-xs leading-5">{masterPrompt}</pre><button onClick={exportCharge} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-bold hover:bg-muted"><Download size={15}/> Exportar JSON</button></div>

    <div className="rounded-2xl border border-border bg-card p-6"><h2 className="text-lg font-black">05 · Validação editorial</h2><p className="mt-1 text-sm text-muted-foreground">Todas as quatro validações são obrigatórias antes de aprovar.</p><div className="mt-5 space-y-3">{([ ["identity","Identidade dos personagens"],["continuity","Continuidade entre cenas"],["factual","Coerência factual"],["format","Formato vertical 9:16"] ] as [keyof CheckState,string][]).map(([key,label])=><button key={key} onClick={()=>toggleCheck(key)} className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left text-sm font-bold ${checks[key]?"border-primary/40 bg-primary/5":"border-border"}`}><span className={`flex h-5 w-5 items-center justify-center rounded-md border ${checks[key]?"border-primary bg-primary text-primary-foreground":"border-input"}`}>{checks[key]&&<Check size={13}/>}</span>{label}</button>)}</div><div className="mt-5 flex items-center justify-between rounded-xl bg-muted p-4"><span className="text-sm font-bold">Status</span><span className={`text-xs font-black ${ready?"text-primary":"text-muted-foreground"}`}>{ready?"PRONTO PARA APROVAÇÃO":"PENDENTE"}</span></div></div></section>

    <section className="rounded-2xl border border-border bg-card p-6"><div className="flex items-center justify-between"><div><div className="flex items-center gap-2"><Library size={18} className="text-primary"/><h2 className="text-lg font-black">06 · Banco de Charges</h2></div><p className="mt-1 text-sm text-muted-foreground">Persistência real no Supabase — não depende mais do navegador.</p></div><span className="rounded-full bg-muted px-3 py-1 text-xs font-black">{saved.length} charges</span></div>{loading ? <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="animate-spin" size={16}/> Carregando banco...</div> : saved.length === 0 ? <div className="py-8 text-sm text-muted-foreground">Nenhuma charge salva ainda. Crie a primeira acima.</div> : <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{saved.map((item)=><article key={item.id} className="rounded-xl border border-border p-4"><div className="flex items-center justify-between"><span className="text-[10px] font-black text-primary">{item.id}</span><span className="rounded-full bg-muted px-2 py-1 text-[10px] font-black">{item.stage}</span></div><h3 className="mt-3 line-clamp-2 font-black">{item.headline}</h3><p className="mt-2 text-xs text-muted-foreground">{item.type} · atualizado {new Date(item.updatedAt).toLocaleString("pt-BR")}</p><div className="mt-4 flex gap-2"><button onClick={()=>load(item)} className="flex-1 rounded-lg bg-muted px-3 py-2 text-xs font-black hover:bg-muted/70">Abrir</button><button onClick={()=>void remove(item.id)} disabled={deleting===item.id} className="rounded-lg border border-border px-3 py-2 text-xs font-black hover:bg-muted disabled:opacity-50">{deleting===item.id?<Loader2 className="animate-spin" size={14}/>:<Trash2 size={14}/>}</button></div></article>)}</div>}</section>

    <div className="flex justify-end"><button onClick={advance} disabled={stage === "VALIDAÇÃO" && !ready} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40">Avançar no pipeline <ChevronRight size={17}/></button></div>
  </div></div>;
}

function download(name: string, text: string) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "application/json" })); a.download = name; a.click(); URL.revokeObjectURL(a.href); }
