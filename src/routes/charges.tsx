import { createFileRoute } from "@tanstack/react-router";
import { Check, ChevronRight, Image as ImageIcon, RotateCcw, Sparkles, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/charges")({ component: ChargesStudio });

type ChargeStage = "PAUTA" | "CONCEITO" | "FRASE" | "STORYBOARD" | "PROMPT" | "GERAÇÃO" | "VALIDAÇÃO" | "APROVADA";
type ChargeType = "IMPACTO" | "IRONIA" | "ESTRATÉGIA" | "CONFRONTO" | "PROVOCAÇÃO";

const stages: ChargeStage[] = ["PAUTA", "CONCEITO", "FRASE", "STORYBOARD", "PROMPT", "GERAÇÃO", "VALIDAÇÃO", "APROVADA"];
const chargeTypes: ChargeType[] = ["IMPACTO", "IRONIA", "ESTRATÉGIA", "CONFRONTO", "PROVOCAÇÃO"];

const initialBrief = {
  headline: "",
  facts: "",
  whyItMatters: "",
  characters: "",
  sources: "",
  type: "IMPACTO" as ChargeType,
};

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
  if (!brief.headline) return "A conta chegou.";
  const phrases: Record<ChargeType, string[]> = {
    IMPACTO: ["Agora apertou.", "A conta chegou.", "O efeito veio."],
    IRONIA: ["Que coincidência.", "Tudo sob controle.", "Era só o começo."],
    ESTRATÉGIA: ["Hora de recalcular.", "Próximo movimento.", "Jogo virou."],
    CONFRONTO: ["Quem manda agora?", "É guerra política.", "Ninguém recua."],
    PROVOCAÇÃO: ["E agora?", "Quem paga a conta?", "Tem algo aí."],
  };
  return phrases[brief.type][0];
}

function buildPrompt(brief: typeof initialBrief, concept: string, phrase: string) {
  return [
    "EDITORIAL POLITICAL CARICATURE — VERTICAL 9:16",
    "",
    "STYLE: detailed editorial caricature face, expressive cartoon editorial body, polished newsroom illustration, controlled color accents, strong visual readability, suitable for animation.",
    `SUBJECT: ${brief.headline || "pauta política presidencial"}`,
    `FACTUAL BASIS: ${brief.facts || "usar somente os fatos fornecidos pela pauta verificada"}`,
    `CHARACTERS: ${brief.characters || "personagens definidos pela pauta"}`,
    `VISUAL CONCEPT: ${concept}`,
    `CHARGE PHRASE: ${phrase}`,
    "COMPOSITION: main character in clear foreground, supporting elements in secondary depth, one dominant metaphor, clean negative space for captions, no visual clutter.",
    "IDENTITY: preserve supplied character references, recognizable facial traits, consistent body proportions and recurring identifiers.",
    "EDITORIAL SAFETY: do not invent events, quotes, documents, objects presented as factual evidence, or actions not supported by the source material.",
    "OUTPUT: single coherent charge frame, no watermark, no malformed text, no duplicated characters, optimized for a 9:16 short.",
  ].join("\n");
}

function ChargesStudio() {
  const [brief, setBrief] = useState(initialBrief);
  const [stage, setStage] = useState<ChargeStage>("PAUTA");
  const [generated, setGenerated] = useState(false);

  const concept = useMemo(() => buildConcept(brief), [brief]);
  const phrase = useMemo(() => buildChargePhrase(brief), [brief]);
  const prompt = useMemo(() => buildPrompt(brief, concept, phrase), [brief, concept, phrase]);
  const stageIndex = stages.indexOf(stage);

  const advance = () => {
    const next = stages[Math.min(stageIndex + 1, stages.length - 1)]!;
    setStage(next);
    if (next === "GERAÇÃO") setGenerated(true);
  };

  const reset = () => {
    setBrief(initialBrief);
    setStage("PAUTA");
    setGenerated(false);
  };

  const update = (key: keyof typeof initialBrief, value: string) => setBrief((current) => ({ ...current, [key]: value }));

  return (
    <div className="min-h-screen bg-background px-6 py-8 text-foreground">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-primary"><Sparkles size={15} /> POLÍTICA EM X MINUTOS</div>
            <h1 className="text-3xl font-black tracking-tight">Fábrica de Charges</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Direção visual estruturada: pauta → conceito → frase-charge → storyboard → prompt → geração → validação.</p>
          </div>
          <button onClick={reset} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-bold hover:bg-muted"><RotateCcw size={16} /> Reiniciar</button>
        </header>

        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="grid gap-2 md:grid-cols-8">
            {stages.map((item, index) => {
              const done = index < stageIndex;
              const active = item === stage;
              return <button key={item} onClick={() => setStage(item)} className={`rounded-xl px-2 py-3 text-[10px] font-black tracking-wider transition ${active ? "bg-primary text-primary-foreground" : done ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}><span className="block">{done ? <Check className="mx-auto mb-1" size={14} /> : index + 1}</span>{item}</button>;
            })}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
            <div><h2 className="text-lg font-black">01 · Pauta de entrada</h2><p className="text-sm text-muted-foreground">Esta etapa alimentará futuramente o Make/pipeline editorial.</p></div>
            <input value={brief.headline} onChange={(e) => update("headline", e.target.value)} placeholder="Manchete da pauta" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            <textarea value={brief.facts} onChange={(e) => update("facts", e.target.value)} placeholder="O que aconteceu? Use somente fatos verificados." className="min-h-24 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            <textarea value={brief.whyItMatters} onChange={(e) => update("whyItMatters", e.target.value)} placeholder="Por que isso importa?" className="min-h-20 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            <input value={brief.characters} onChange={(e) => update("characters", e.target.value)} placeholder="Personagens envolvidos (ex.: Lula, Bolsonaro, Congresso)" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            <input value={brief.sources} onChange={(e) => update("sources", e.target.value)} placeholder="Fontes verificadas" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            <div>
              <label className="mb-2 block text-xs font-black tracking-wider text-muted-foreground">TIPO DA CHARGE</label>
              <div className="flex flex-wrap gap-2">{chargeTypes.map((item) => <button key={item} onClick={() => update("type", item)} className={`rounded-full px-3 py-2 text-xs font-black ${brief.type === item ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{item}</button>)}</div>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
            <div><h2 className="text-lg font-black">02 · Direção visual</h2><p className="text-sm text-muted-foreground">O sistema transforma a notícia em uma metáfora visual antes de gerar a arte.</p></div>
            <div className="rounded-xl bg-muted/60 p-4"><span className="text-[10px] font-black tracking-widest text-muted-foreground">CONCEITO</span><p className="mt-2 text-sm leading-6">{concept}</p></div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4"><span className="text-[10px] font-black tracking-widest text-primary">FRASE-CHARGE</span><p className="mt-2 text-2xl font-black">“{phrase}”</p></div>
            <div className="rounded-xl bg-muted/60 p-4"><span className="text-[10px] font-black tracking-widest text-muted-foreground">STORYBOARD BASE</span><ol className="mt-2 space-y-2 text-sm"><li><b>01.</b> Gancho visual e identificação dos personagens.</li><li><b>02.</b> Ação/metáfora principal ligada ao fato.</li><li><b>03.</b> Reação dos personagens e consequência.</li><li><b>04.</b> Fechamento com a frase-charge.</li></ol></div>
          </section>
        </div>

        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-black">03 · Prompt Builder</h2><p className="text-sm text-muted-foreground">Prompt pronto para o motor visual, preservando identidade e base factual.</p></div><Wand2 size={20} className="text-primary" /></div>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-muted p-4 text-xs leading-5">{prompt}</pre>
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-primary/10 p-3 text-primary"><ImageIcon size={22} /></div><div><h2 className="font-black">Etapa atual: {stage}</h2><p className="text-sm text-muted-foreground">{generated ? "Payload visual preparado para geração e validação." : "Preencha a pauta e avance pelas etapas."}</p></div></div>
          <button onClick={advance} disabled={!brief.headline || stage === "APROVADA"} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40">{stage === "APROVADA" ? "Charge aprovada" : "Avançar etapa"}<ChevronRight size={17} /></button>
        </section>
      </div>
    </div>
  );
}
