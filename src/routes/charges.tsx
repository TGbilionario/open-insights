import { createFileRoute } from "@tanstack/react-router";
import { Check, ChevronRight, Copy, Image as ImageIcon, Lock, RotateCcw, Sparkles, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/charges")({ component: ChargesStudio });

type ChargeStage = "PAUTA" | "CONCEITO" | "FRASE" | "STORYBOARD" | "PROMPT" | "GERAÇÃO" | "VALIDAÇÃO" | "APROVADA";
type ChargeType = "IMPACTO" | "IRONIA" | "ESTRATÉGIA" | "CONFRONTO" | "PROVOCAÇÃO";

type Scene = {
  id: number;
  label: string;
  duration: string;
  action: string;
  camera: string;
  prompt: string;
};

const stages: ChargeStage[] = ["PAUTA", "CONCEITO", "FRASE", "STORYBOARD", "PROMPT", "GERAÇÃO", "VALIDAÇÃO", "APROVADA"];
const chargeTypes: ChargeType[] = ["IMPACTO", "IRONIA", "ESTRATÉGIA", "CONFRONTO", "PROVOCAÇÃO"];
const initialBrief = { headline: "", facts: "", whyItMatters: "", characters: "", sources: "", type: "IMPACTO" as ChargeType };

function buildConcept(brief: typeof initialBrief) {
  const people = brief.characters || "personagens envolvidos na pauta";
  const subject = brief.headline || "a pauta selecionada";
  const concepts: Record<ChargeType, string> = {
    IMPACTO: `Representar visualmente a consequência central de ${subject}, colocando ${people} diante do resultado da decisão.`,
    IRONIA: `Criar uma situação visual de contraste em que ${people} encaram uma consequência irônica diretamente ligada a ${subject}.`,
    ESTRATÉGIA: `Transformar ${subject} em um jogo de estratégia, mostrando ${people} como jogadores tomando posições.`,
    CONFRONTO: `Colocar ${people} em oposição visual clara, usando ${subject} como elemento central do conflito.`,
    PROVOCAÇÃO: `Criar uma metáfora visual forte sobre ${subject}, com ${people} em uma situação que provoque curiosidade sem inventar fatos.`,
  };
  return concepts[brief.type];
}

function buildChargePhrase(brief: typeof initialBrief) {
  const phrases: Record<ChargeType, string[]> = {
    IMPACTO: ["Agora apertou.", "A conta chegou.", "O efeito veio."],
    IRONIA: ["Que coincidência.", "Tudo sob controle.", "Era só o começo."],
    ESTRATÉGIA: ["Hora de recalcular.", "Próximo movimento.", "Jogo virou."],
    CONFRONTO: ["Quem manda agora?", "É guerra política.", "Ninguém recua."],
    PROVOCAÇÃO: ["E agora?", "Quem paga a conta?", "Tem algo aí."],
  };
  return brief.headline ? phrases[brief.type][0] : "A conta chegou.";
}

function buildScenes(brief: typeof initialBrief, concept: string, phrase: string): Scene[] {
  const people = brief.characters || "personagens da pauta";
  const subject = brief.headline || "a pauta política";
  const base = `EDITORIAL POLITICAL CARICATURE, vertical 9:16. Detailed caricature faces, expressive cartoon editorial bodies, polished newsroom illustration, controlled color accents. CHARACTERS: ${people}. IDENTITY LOCK: preserve supplied character references, facial traits, body proportions, recurring clothing and identifiers in every scene. SUBJECT: ${subject}. CONCEPT: ${concept}. FACTUAL RULE: depict only the supplied verified facts; metaphorical objects must be clearly editorial symbolism, never fabricated evidence. No watermark, no malformed text, no duplicated characters.`;
  return [
    { id: 1, label: "GANCHO", duration: "0–3s", action: `Apresentar ${people} em uma composição imediatamente legível que introduza o conflito de ${subject}.`, camera: "Plano médio com leve aproximação, foco no protagonista.", prompt: `${base} SCENE 01 — HOOK. ${people} are introduced in the visual situation. ${subject} is suggested by one clear symbolic element. Strong readable silhouette, clean negative space. CAMERA: medium shot, subtle push-in.` },
    { id: 2, label: "CONFLITO", duration: "3–8s", action: `Mostrar a ação central da metáfora escolhida, conectando visualmente o conflito à pauta.`, camera: "Plano aberto para revelar a metáfora e os personagens.", prompt: `${base} SCENE 02 — CONFLICT. Show the central editorial metaphor from the concept. Characters interact with the symbolic situation, without adding unsupported factual actions. CAMERA: wider composition, readable foreground/background depth.` },
    { id: 3, label: "REAÇÃO", duration: "8–13s", action: `Destacar a reação dos personagens e a consequência visual do conflito.`, camera: "Close editorial no protagonista, com o elemento metafórico ainda reconhecível.", prompt: `${base} SCENE 03 — REACTION. Emphasize the protagonist's expressive reaction to the consequence created by the metaphor. Keep the same setting, wardrobe and character identity. CAMERA: editorial close-up, shallow visual depth.` },
    { id: 4, label: "FECHAMENTO", duration: "13–18s", action: `Encerrar com a composição mais forte e espaço limpo para a frase-charge: “${phrase}”.`, camera: "Plano heroico/estático com espaço negativo para texto.", prompt: `${base} SCENE 04 — PAYOFF. Resolve the visual metaphor in one strong final composition. Leave intentional negative space for the charge phrase “${phrase}”; do not render the phrase inside the image. CAMERA: stable hero frame, strong focal hierarchy.` },
  ];
}

function buildMasterPrompt(brief: typeof initialBrief, concept: string, phrase: string) {
  return [`EDITORIAL POLITICAL CARICATURE — MASTER STYLE LOCK`, `FORMAT: vertical 9:16; designed for short-form animation.`, `STYLE: detailed editorial caricature face + expressive cartoon editorial body + polished newsroom illustration + controlled color accents.`, `CHARACTERS: ${brief.characters || "defined by the verified pauta"}.`, `IDENTITY LOCK: same facial structure, recognizable traits, body proportions, wardrobe logic and recurring identifiers across every scene.`, `SUBJECT: ${brief.headline || "verified political pauta"}.`, `FACTUAL BASIS: ${brief.facts || "only verified facts supplied by the editorial pipeline"}.`, `VISUAL CONCEPT: ${concept}`, `CHARGE PHRASE: ${phrase}`, `SOURCES: ${brief.sources || "attach verified sources before publication"}.`, `NEGATIVE RULES: no invented facts, quotes, documents or actions; no identity drift; no extra characters; no malformed hands/faces; no watermark; no random text.`, `CONTINUITY: keep environment, lighting direction, costume, character scale and palette coherent between scenes.`].join("\n");
}

function ChargesStudio() {
  const [brief, setBrief] = useState(initialBrief);
  const [stage, setStage] = useState<ChargeStage>("PAUTA");
  const [generated, setGenerated] = useState(false);
  const [checks, setChecks] = useState<Record<string, boolean>>({ identity: false, scene: false, factual: false, format: false });
  const [copied, setCopied] = useState(false);
  const concept = useMemo(() => buildConcept(brief), [brief]);
  const phrase = useMemo(() => buildChargePhrase(brief), [brief]);
  const masterPrompt = useMemo(() => buildMasterPrompt(brief, concept, phrase), [brief, concept, phrase]);
  const scenes = useMemo(() => buildScenes(brief, concept, phrase), [brief, concept, phrase]);
  const stageIndex = stages.indexOf(stage);
  const update = (key: keyof typeof initialBrief, value: string) => setBrief((current) => ({ ...current, [key]: value }));
  const advance = () => { const next = stages[Math.min(stageIndex + 1, stages.length - 1)]!; setStage(next); if (next === "GERAÇÃO") setGenerated(true); };
  const reset = () => { setBrief(initialBrief); setStage("PAUTA"); setGenerated(false); setChecks({ identity: false, scene: false, factual: false, format: false }); };
  const toggleCheck = (key: string) => setChecks((current) => ({ ...current, [key]: !current[key] }));
  const validationReady = Object.values(checks).every(Boolean);
  const copyPrompt = async () => { try { await navigator.clipboard.writeText(masterPrompt); setCopied(true); window.setTimeout(() => setCopied(false), 1500); } catch { setCopied(false); } };

  return <div className="min-h-screen bg-background px-6 py-8 text-foreground">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div><div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-primary"><Sparkles size={15} /> POLÍTICA EM X MINUTOS</div><h1 className="text-3xl font-black tracking-tight">Fábrica de Charges</h1><p className="mt-1 max-w-3xl text-sm text-muted-foreground">Da pauta verificada à sequência de cenas, com identidade visual travada para evitar que o personagem mude entre os frames.</p></div>
        <button onClick={reset} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-bold hover:bg-muted"><RotateCcw size={16} /> Reiniciar</button>
      </header>

      <section className="rounded-2xl border border-border bg-card p-4"><div className="grid gap-2 md:grid-cols-8">{stages.map((item, index) => { const done = index < stageIndex; const active = item === stage; return <button key={item} onClick={() => setStage(item)} className={`rounded-xl px-2 py-3 text-[10px] font-black tracking-wider transition ${active ? "bg-primary text-primary-foreground" : done ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}><span className="block">{done ? <Check className="mx-auto mb-1" size={14} /> : index + 1}</span>{item}</button>; })}</div></section>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
        <section className="space-y-4 rounded-2xl border border-border bg-card p-6"><div><h2 className="text-lg font-black">01 · Pauta de entrada</h2><p className="text-sm text-muted-foreground">Estrutura pronta para receber a pauta que virá do pipeline editorial/Make.</p></div>
          <input value={brief.headline} onChange={(e) => update("headline", e.target.value)} placeholder="Manchete da pauta" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <textarea value={brief.facts} onChange={(e) => update("facts", e.target.value)} placeholder="O que aconteceu? Somente fatos verificados." className="min-h-24 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <textarea value={brief.whyItMatters} onChange={(e) => update("whyItMatters", e.target.value)} placeholder="Por que isso importa?" className="min-h-20 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <input value={brief.characters} onChange={(e) => update("characters", e.target.value)} placeholder="Personagens envolvidos" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <input value={brief.sources} onChange={(e) => update("sources", e.target.value)} placeholder="Fontes verificadas" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <div><label className="mb-2 block text-xs font-black tracking-wider text-muted-foreground">TIPO DA CHARGE</label><div className="flex flex-wrap gap-2">{chargeTypes.map((item) => <button key={item} onClick={() => update("type", item)} className={`rounded-full px-3 py-2 text-xs font-black ${brief.type === item ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{item}</button>)}</div></div>
        </section>
        <section className="space-y-4 rounded-2xl border border-border bg-card p-6"><div><h2 className="text-lg font-black">02 · Direção visual</h2><p className="text-sm text-muted-foreground">A notícia vira metáfora antes da imagem.</p></div>
          <div className="rounded-xl bg-muted/60 p-4"><span className="text-[10px] font-black tracking-widest text-muted-foreground">CONCEITO</span><p className="mt-2 text-sm leading-6">{concept}</p></div>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4"><span className="text-[10px] font-black tracking-widest text-primary">FRASE-CHARGE</span><p className="mt-2 text-2xl font-black">“{phrase}”</p></div>
          <div className="rounded-xl bg-muted/60 p-4"><span className="text-[10px] font-black tracking-widest text-muted-foreground">CONTINUIDADE</span><div className="mt-2 flex items-center gap-2 text-sm"><Lock size={15} className="text-primary" /> O mesmo personagem, roupa, cenário e proporção serão reaplicados nas 4 cenas.</div></div>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-black">03 · Fábrica de cenas</h2><p className="text-sm text-muted-foreground">Quatro frames encadeados para transformar a charge em Short.</p></div><ImageIcon size={20} className="text-primary" /></div>
        <div className="grid gap-4 md:grid-cols-2">{scenes.map((scene) => <article key={scene.id} className="rounded-2xl border border-border bg-background p-5"><div className="flex items-center justify-between"><span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black text-primary">CENA {String(scene.id).padStart(2, "0")}</span><span className="text-xs font-bold text-muted-foreground">{scene.duration}</span></div><h3 className="mt-4 font-black">{scene.label}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{scene.action}</p><div className="mt-3 rounded-xl bg-muted p-3 text-xs"><b>Câmera:</b> {scene.camera}</div><details className="mt-3"><summary className="cursor-pointer text-xs font-black text-primary">Ver prompt da cena</summary><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-muted p-3 text-[11px] leading-5">{scene.prompt}</pre></details></article>)}</div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-black">04 · Master Prompt + Identity Lock</h2><p className="text-sm text-muted-foreground">Um único padrão visual é compartilhado por todas as cenas.</p></div><Wand2 size={20} className="text-primary" /></div><div className="flex gap-2"><button onClick={copyPrompt} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-black hover:bg-muted"><Copy size={14} /> {copied ? "Copiado" : "Copiar prompt"}</button></div><pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-muted p-4 text-xs leading-5">{masterPrompt}</pre></section>

      <section className="rounded-2xl border border-border bg-card p-6"><div className="mb-4"><h2 className="text-lg font-black">05 · Validação visual</h2><p className="text-sm text-muted-foreground">A charge só pode avançar quando os quatro critérios forem conferidos.</p></div><div className="grid gap-3 md:grid-cols-4">{[["identity","Identidade dos personagens"],["scene","Cenas coerentes"],["factual","Coerência factual"],["format","Formato 9:16"]].map(([key,label]) => <button key={key} onClick={() => toggleCheck(key)} className={`flex items-center gap-3 rounded-xl border p-4 text-left text-sm font-bold transition ${checks[key] ? "border-primary/30 bg-primary/5" : "border-border bg-background"}`}><span className={`grid h-7 w-7 place-items-center rounded-full ${checks[key] ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{checks[key] ? <Check size={15} /> : ""}</span>{label}</button>)}</div></section>

      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 md:flex-row md:items-center md:justify-between"><div className="flex items-center gap-3"><div className="rounded-xl bg-primary/10 p-3 text-primary"><Sparkles size={21} /></div><div><h2 className="font-black">Etapa atual: {stage}</h2><p className="text-sm text-muted-foreground">{stage === "VALIDAÇÃO" && !validationReady ? "Conclua a validação visual para aprovar." : generated ? "Sequência preparada para geração/edição." : "Preencha a pauta e avance pelas etapas."}</p></div></div><button onClick={advance} disabled={!brief.headline || stage === "APROVADA" || (stage === "VALIDAÇÃO" && !validationReady)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40">{stage === "APROVADA" ? "Charge aprovada" : "Avançar etapa"}<ChevronRight size={17} /></button></section>
    </div>
  </div>;
}
