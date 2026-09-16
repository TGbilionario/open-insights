import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, FileText, Filter, Plus, Save, Search, Trash2, X, Zap } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/editorial")({ component: EditorialStudio });

type ContentType = "FATO" | "ANÁLISE" | "CONTEXTO" | "PROJEÇÃO";
type Status = "DESCOBERTO" | "EM ANÁLISE" | "PAUTA APROVADA" | "ROTEIRO" | "PRODUÇÃO VISUAL" | "NARRAÇÃO" | "EDIÇÃO" | "VERIFICAÇÃO" | "PRONTO" | "PUBLICADO";
type Category = "PRINCIPAIS DO DIA" | "PRESIDENTE" | "PESQUISAS" | "ELEIÇÕES" | "CONGRESSO" | "STF/TSE" | "CANDIDATOS" | "PARTIDOS" | "ECONOMIA E POLÍTICA" | "POLÊMICAS" | "BASTIDORES";
type Content = { id?: string; content_code: string; title: string; category: Category; subcategory: string; content_type: ContentType; status: Status; published_at: string; headline: string; fact: string; context: string; analysis: string; projection: string; charge_phrase: string; characters: string; parties: string; institutions: string; subjects: string; keywords: string; sources: string; relevance_score: number; editorial_note: string; visual_concept: string; };

const statuses: Status[] = ["DESCOBERTO", "EM ANÁLISE", "PAUTA APROVADA", "ROTEIRO", "PRODUÇÃO VISUAL", "NARRAÇÃO", "EDIÇÃO", "VERIFICAÇÃO", "PRONTO", "PUBLICADO"];
const categories: Category[] = ["PRINCIPAIS DO DIA", "PRESIDENTE", "PESQUISAS", "ELEIÇÕES", "CONGRESSO", "STF/TSE", "CANDIDATOS", "PARTIDOS", "ECONOMIA E POLÍTICA", "POLÊMICAS", "BASTIDORES"];
const types: ContentType[] = ["FATO", "ANÁLISE", "CONTEXTO", "PROJEÇÃO"];
const blank: Content = { content_code: "", title: "", category: "PRINCIPAIS DO DIA", subcategory: "", content_type: "FATO", status: "DESCOBERTO", published_at: "", headline: "", fact: "", context: "", analysis: "", projection: "", charge_phrase: "", characters: "", parties: "", institutions: "", subjects: "", keywords: "", sources: "", relevance_score: 0, editorial_note: "", visual_concept: "" };

function code() { return `ED-${Date.now().toString(36).toUpperCase()}`; }
function fromRow(r: any): Content { return { id:r.id, content_code:r.content_code, title:r.title, category:r.category, subcategory:r.subcategory || "", content_type:r.content_type, status:r.status, published_at:r.published_at ? String(r.published_at).slice(0,16) : "", headline:r.headline || "", fact:r.fact || "", context:r.context || "", analysis:r.analysis || "", projection:r.projection || "", charge_phrase:r.charge_phrase || "", characters:r.characters || "", parties:r.parties || "", institutions:r.institutions || "", subjects:r.subjects || "", keywords:r.keywords || "", sources:r.sources || "", relevance_score:Number(r.relevance_score || 0), editorial_note:r.editorial_note || "", visual_concept:r.visual_concept || "" }; }

function EditorialStudio() {
  const [items,setItems] = useState<Content[]>([]);
  const [form,setForm] = useState<Content>(blank);
  const [query,setQuery] = useState("");
  const [status,setStatus] = useState<Status | "TODOS">("TODOS");
  const [category,setCategory] = useState<Category | "TODAS">("TODAS");
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [message,setMessage] = useState("");
  const [open,setOpen] = useState(false);

  const load = async () => { setLoading(true); const {data,error}=await supabase.from("editorial_content").select("*").order("relevance_score",{ascending:false}).order("created_at",{ascending:false}); if(error) setMessage(`Erro ao carregar banco: ${error.message}`); else setItems((data||[]).map(fromRow)); setLoading(false); };
  useEffect(()=>{void load();},[]);

  const filtered = useMemo(()=>items.filter(x=>{ const q=query.trim().toLowerCase(); const hay=[x.content_code,x.title,x.headline,x.fact,x.context,x.characters,x.parties,x.institutions,x.subjects,x.keywords,x.sources,x.category,x.subcategory].join(" ").toLowerCase(); return (!q||hay.includes(q))&&(status==="TODOS"||x.status===status)&&(category==="TODAS"||x.category===category); }),[items,query,status,category]);
  const set = (key:keyof Content,value:string|number) => setForm(f=>({...f,[key]:value}));
  const newContent = () => { setForm({...blank,content_code:code()}); setOpen(true); setMessage(""); };
  const edit = (item:Content) => { setForm({...item}); setOpen(true); setMessage(""); window.scrollTo({top:0,behavior:"smooth"}); };
  const openChargeFactory = (item:Content) => { window.location.assign(`/charges?content=${encodeURIComponent(item.content_code)}`); };
  const save = async () => { if(!form.title.trim()) {setMessage("Informe o título do conteúdo."); return;} setSaving(true); setMessage(""); const payload={content_code:form.content_code||code(),title:form.title,category:form.category,subcategory:form.subcategory,content_type:form.content_type,status:form.status,published_at:form.published_at?new Date(form.published_at).toISOString():null,headline:form.headline,fact:form.fact,context:form.context,analysis:form.analysis,projection:form.projection,charge_phrase:form.charge_phrase,characters:form.characters,parties:form.parties,institutions:form.institutions,subjects:form.subjects,keywords:form.keywords,sources:form.sources,relevance_score:Math.max(0,Math.min(10,Number(form.relevance_score)||0)),editorial_note:form.editorial_note,visual_concept:form.visual_concept}; const {data,error}=await supabase.from("editorial_content").upsert(payload,{onConflict:"content_code"}).select().single(); if(error) setMessage(`Não foi possível salvar: ${error.message}`); else {const next=fromRow(data); setItems(xs=>[next,...xs.filter(x=>x.content_code!==next.content_code)]); setForm(next); setOpen(true); setMessage("Conteúdo salvo no Banco de Conteúdo.");} setSaving(false); };
  const remove = async (item:Content) => { if(!item.id) return; const {error}=await supabase.from("editorial_content").delete().eq("id",item.id); if(error) setMessage(`Não foi possível excluir: ${error.message}`); else {setItems(xs=>xs.filter(x=>x.id!==item.id)); if(form.id===item.id){setForm(blank);setOpen(false);} setMessage("Conteúdo excluído.");} };
  const advance = (item:Content) => { const i=statuses.indexOf(item.status); if(i>=statuses.length-1)return; const next={...item,status:statuses[i+1]!}; setForm(next); setOpen(true); setMessage(`Status preparado: ${next.status}. Salve para confirmar.`); window.scrollTo({top:0,behavior:"smooth"}); };

  const counts = statuses.map(s=>({s,n:items.filter(x=>x.status===s).length}));
  return <div style={{padding:"28px",minHeight:"100vh"}}>
    <div style={{maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"flex-start",marginBottom:22}}>
        <div><div style={{fontSize:12,fontWeight:800,letterSpacing:2,opacity:.65}}>CENTRAL EDITORIAL</div><h1 style={{fontSize:32,margin:"6px 0 8px"}}>Banco de Conteúdo</h1><p style={{margin:0,opacity:.7}}>Pautas, fatos, contexto, fontes e produção em um único lugar.</p></div>
        <button onClick={newContent} style={primary}><Plus size={17}/> Nova pauta</button>
      </div>
      <div style={statGrid}>{counts.map(({s,n})=><button key={s} onClick={()=>setStatus(s)} style={{...statCard,outline:status===s?"2px solid currentColor":"none"}}><span>{s}</span><b>{n}</b></button>)}</div>
      <div style={toolbar}><div style={searchBox}><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pesquisar candidato, assunto, fonte, palavra-chave..."/><Filter size={16}/></div><select value={category} onChange={e=>setCategory(e.target.value as any)} style={select}><option>TODAS</option>{categories.map(x=><option key={x}>{x}</option>)}</select><select value={status} onChange={e=>setStatus(e.target.value as any)} style={select}><option>TODOS</option>{statuses.map(x=><option key={x}>{x}</option>)}</select></div>
      {open && <section style={editor}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div><strong>{form.content_code||"NOVA PAUTA"}</strong><span style={{opacity:.55,marginLeft:10}}>EDITORIAL</span></div><button onClick={()=>setOpen(false)} style={iconBtn}><X size={18}/></button></div>
        <div style={grid2}><Field label="Título"><input value={form.title} onChange={e=>set("title",e.target.value)} placeholder="Título editorial"/></Field><Field label="Manchete"><input value={form.headline} onChange={e=>set("headline",e.target.value)} placeholder="Manchete do acontecimento"/></Field></div>
        <div style={grid3}><Field label="Categoria"><select value={form.category} onChange={e=>set("category",e.target.value as any)}>{categories.map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Subcategoria"><input value={form.subcategory} onChange={e=>set("subcategory",e.target.value)} /></Field><Field label="Tipo"><select value={form.content_type} onChange={e=>set("content_type",e.target.value as any)}>{types.map(x=><option key={x}>{x}</option>)}</select></Field></div>
        <div style={grid3}><Field label="Status"><select value={form.status} onChange={e=>set("status",e.target.value as any)}>{statuses.map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Nota editorial (0–10)"><input type="number" min="0" max="10" step="0.1" value={form.relevance_score} onChange={e=>set("relevance_score",Number(e.target.value))}/></Field><Field label="Data/hora"><input type="datetime-local" value={form.published_at} onChange={e=>set("published_at",e.target.value)}/></Field></div>
        <div style={grid2}><Field label="Fato principal"><textarea value={form.fact} onChange={e=>set("fact",e.target.value)} rows={4}/></Field><Field label="Contexto"><textarea value={form.context} onChange={e=>set("context",e.target.value)} rows={4}/></Field></div>
        <div style={grid2}><Field label="Análise"><textarea value={form.analysis} onChange={e=>set("analysis",e.target.value)} rows={4}/></Field><Field label="Projeção / próximos passos"><textarea value={form.projection} onChange={e=>set("projection",e.target.value)} rows={4}/></Field></div>
        <div style={grid3}><Field label="Personagens"><input value={form.characters} onChange={e=>set("characters",e.target.value)} placeholder="Nomes separados por vírgula"/></Field><Field label="Partidos"><input value={form.parties} onChange={e=>set("parties",e.target.value)}/></Field><Field label="Instituições"><input value={form.institutions} onChange={e=>set("institutions",e.target.value)}/></Field></div>
        <div style={grid2}><Field label="Assuntos"><input value={form.subjects} onChange={e=>set("subjects",e.target.value)}/></Field><Field label="Palavras-chave"><input value={form.keywords} onChange={e=>set("keywords",e.target.value)} placeholder="Termos para Pesquisa Detalhada"/></Field></div>
        <div style={grid2}><Field label="URLs / fontes"><textarea value={form.sources} onChange={e=>set("sources",e.target.value)} rows={3} placeholder="Uma fonte por linha"/></Field><Field label="Frase-charge"><input value={form.charge_phrase} onChange={e=>set("charge_phrase",e.target.value)} placeholder="2–7 palavras"/></Field></div>
        <div style={grid2}><Field label="Conceito visual"><textarea value={form.visual_concept} onChange={e=>set("visual_concept",e.target.value)} rows={3}/></Field><Field label="Nota editorial / observações"><textarea value={form.editorial_note} onChange={e=>set("editorial_note",e.target.value)} rows={3}/></Field></div>
        <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",marginTop:16}}><span style={{fontSize:13,opacity:.65}}>{message}</span><div style={{display:"flex",gap:8}}>{form.id&&<button onClick={()=>remove(form)} style={danger}><Trash2 size={16}/> Excluir</button>}<button onClick={save} disabled={saving} style={primary}>{saving?<span>Salvando...</span>:<><Save size={16}/> Salvar conteúdo</>}</button></div></div>
      </section>}
      <section><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",margin:"22px 0 10px"}}><h2 style={{fontSize:18,margin:0}}>Conteúdos {filtered.length ? `(${filtered.length})` : ""}</h2>{loading&&<span style={{fontSize:13,opacity:.6}}>Carregando...</span>}</div>
        {!loading&&!filtered.length&&<div style={empty}><FileText size={28}/><b>Nenhum conteúdo encontrado</b><span>Crie a primeira pauta ou ajuste os filtros.</span><button onClick={newContent} style={primary}><Plus size={15}/> Nova pauta</button></div>}
        <div style={{display:"grid",gap:10}}>{filtered.map(item=><article key={item.id||item.content_code} onClick={()=>edit(item)} style={row}><div style={{minWidth:0,flex:1}}><div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><code>{item.content_code}</code><span style={pill}>{item.status}</span><span style={softPill}>{item.category}</span><span style={score}>RELEVÂNCIA {item.relevance_score.toFixed(1)}</span></div><h3 style={{margin:"8px 0 4px",fontSize:17}}>{item.title}</h3><p style={{margin:0,opacity:.68,fontSize:13,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.fact||item.headline||"Sem fato principal preenchido."}</p></div><div style={{display:"flex",gap:6}}>{item.status==="PAUTA APROVADA"&&<button onClick={e=>{e.stopPropagation();openChargeFactory(item)}} style={chargeBtn} title="Abrir na Fábrica de Charges"><Zap size={16}/> Criar charge</button>}<button onClick={e=>{e.stopPropagation();advance(item)}} style={iconBtn} title="Preparar próximo status"><ChevronDown size={17}/></button><button onClick={e=>{e.stopPropagation();void remove(item)}} style={iconBtn} title="Excluir"><Trash2 size={17}/></button></div></article>)}</div>
      </section>
    </div>
  </div>;
}

function Field({label,children}:{label:string;children:React.ReactNode}) { return <label style={{display:"grid",gap:6,fontSize:12,fontWeight:800}}><span>{label}</span>{children}</label>; }
const primary:CSSProperties={border:0,borderRadius:10,padding:"11px 15px",fontWeight:800,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:7};
const chargeBtn:CSSProperties={...primary,padding:"8px 10px",fontSize:11};
const danger:CSSProperties={...primary};
const iconBtn:CSSProperties={border:"1px solid rgba(127,127,127,.25)",background:"transparent",borderRadius:8,padding:8,cursor:"pointer",display:"inline-flex"};
const statGrid:CSSProperties={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:8,marginBottom:14};
const statCard:CSSProperties={border:"1px solid rgba(127,127,127,.22)",background:"transparent",borderRadius:10,padding:"10px 11px",textAlign:"left",cursor:"pointer",display:"grid",gap:5};
const toolbar:CSSProperties={display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"};
const searchBox:CSSProperties={flex:1,minWidth:280,border:"1px solid rgba(127,127,127,.22)",borderRadius:10,padding:"0 11px",display:"flex",alignItems:"center",gap:8};
const select:CSSProperties={border:"1px solid rgba(127,127,127,.22)",borderRadius:10,padding:"10px",background:"transparent"};
const editor:CSSProperties={border:"1px solid rgba(127,127,127,.25)",borderRadius:14,padding:18,marginBottom:20,background:"rgba(127,127,127,.04)"};
const grid2:CSSProperties={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:12,marginBottom:12};
const grid3:CSSProperties={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12,marginBottom:12};
const row:CSSProperties={border:"1px solid rgba(127,127,127,.2)",borderRadius:12,padding:"14px 16px",display:"flex",gap:12,alignItems:"center",cursor:"pointer"};
const pill:CSSProperties={fontSize:10,fontWeight:900,letterSpacing:.5,borderRadius:999,padding:"4px 7px",background:"rgba(127,127,127,.12)"};
const softPill:CSSProperties={fontSize:10,fontWeight:800,borderRadius:999,padding:"4px 7px",background:"rgba(127,127,127,.08)"};
const score:CSSProperties={fontSize:10,fontWeight:900,marginLeft:"auto",opacity:.7};
const empty:CSSProperties={border:"1px dashed rgba(127,127,127,.3)",borderRadius:14,padding:38,display:"grid",placeItems:"center",gap:9,textAlign:"center"};