import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft, ArrowRight, Bookmark, Check, ChevronRight, CirclePlay, Clock3,
  ExternalLink, Filter, Flame, History, Home, LayoutDashboard, Menu, Pause,
  Play, Search, Settings, Share2, Sparkles, User, Volume2, VolumeX, X
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

export const Route = createFileRoute("/")({ component: Index });

type Category =
  | "PRINCIPAIS DO DIA" | "PRESIDENTE" | "PESQUISAS" | "ELEIÇÕES" | "CONGRESSO"
  | "STF/TSE" | "CANDIDATOS" | "PARTIDOS" | "ECONOMIA E POLÍTICA" | "POLÊMICAS" | "BASTIDORES";
type StoryType = "FATO" | "ANÁLISE" | "CONTEXTO" | "PROJEÇÃO";
type Page = "home" | "videos" | "summary" | "saved" | "profile" | "admin";

type VideoItem = {
  id: number;
  title: string;
  summary: string;
  category: Category;
  duration: string;
  time: string;
  type: StoryType;
  source: { vehicle: string; title: string; date: string; url: string };
  featured?: boolean;
};

const categories: Category[] = [
  "PRINCIPAIS DO DIA","PRESIDENTE","PESQUISAS","ELEIÇÕES","CONGRESSO","STF/TSE",
  "CANDIDATOS","PARTIDOS","ECONOMIA E POLÍTICA","POLÊMICAS","BASTIDORES"
];

const videos: VideoItem[] = [
  { id:1, title:"A disputa presidencial entra em uma nova fase", summary:"Os principais movimentos políticos que podem mexer com a corrida presidencial.", category:"PRINCIPAIS DO DIA", duration:"01:18", time:"07:10", type:"CONTEXTO", featured:true, source:{vehicle:"Fonte editorial", title:"Adicione a fonte original da pauta", date:"04/09/2026", url:"https://www.gov.br/"} },
  { id:2, title:"O que os novos números de pesquisa realmente mostram", summary:"Entenda os números, a margem de erro e o que ainda não dá para concluir.", category:"PESQUISAS", duration:"01:42", time:"06:48", type:"FATO", source:{vehicle:"Fonte editorial", title:"Adicione a fonte original da pauta", date:"04/09/2026", url:"https://www.tse.jus.br/"} },
  { id:3, title:"Congresso: a pauta que pode virar prioridade", summary:"Veja o que está em jogo e quais grupos políticos estão envolvidos.", category:"CONGRESSO", duration:"01:11", time:"06:20", type:"CONTEXTO", source:{vehicle:"Fonte editorial", title:"Adicione a fonte original da pauta", date:"04/09/2026", url:"https://www.camara.leg.br/"} },
  { id:4, title:"STF e TSE: decisão que merece atenção hoje", summary:"O que foi decidido, quem é afetado e qual pode ser o próximo passo.", category:"STF/TSE", duration:"00:58", time:"05:56", type:"FATO", source:{vehicle:"Fonte editorial", title:"Adicione a fonte original da pauta", date:"04/09/2026", url:"https://www.tse.jus.br/"} },
  { id:5, title:"Bastidores: alianças começam a ganhar forma", summary:"Os movimentos de bastidores que ajudam a explicar o cenário desta semana.", category:"BASTIDORES", duration:"01:25", time:"05:32", type:"ANÁLISE", source:{vehicle:"Fonte editorial", title:"Adicione a fonte original da pauta", date:"04/09/2026", url:"https://www12.senado.leg.br/"} },
  { id:6, title:"Economia e eleição: por que este indicador importa", summary:"A conexão entre economia, governo e percepção do eleitor explicada em minutos.", category:"ECONOMIA E POLÍTICA", duration:"01:36", time:"05:04", type:"CONTEXTO", source:{vehicle:"Fonte editorial", title:"Adicione a fonte original da pauta", date:"04/09/2026", url:"https://www.bcb.gov.br/"} },
  { id:7, title:"Candidatos: o movimento que chamou atenção", summary:"O que aconteceu e por que esse movimento entrou no radar da eleição.", category:"CANDIDATOS", duration:"01:03", time:"04:42", type:"FATO", source:{vehicle:"Fonte editorial", title:"Adicione a fonte original da pauta", date:"04/09/2026", url:"https://www.tse.jus.br/"} },
  { id:8, title:"O que você precisa acompanhar nas próximas horas", summary:"Três pontos que podem mudar o noticiário político ainda hoje.", category:"ELEIÇÕES", duration:"01:20", time:"04:15", type:"PROJEÇÃO", source:{vehicle:"Fonte editorial", title:"Adicione a fonte original da pauta", date:"04/09/2026", url:"https://www.gov.br/"} }
];

function storage<T>(key:string, fallback:T):T {
  if (typeof window === "undefined") return fallback;
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
}

function Index() {
  const [page,setPage] = useState<Page>("home");
  const [selected,setSelected] = useState(1);
  const [query,setQuery] = useState("");
  const [category,setCategory] = useState<Category>("PRINCIPAIS DO DIA");
  const [watched,setWatched] = useState<number[]>(() => storage("pxm-watched", []));
  const [saved,setSaved] = useState<number[]>(() => storage("pxm-saved", []));
  const [menu,setMenu] = useState(false);

  const filtered = useMemo(() => videos.filter(v => {
    const q = query.trim().toLowerCase();
    const categoryMatch = category === "PRINCIPAIS DO DIA" || v.category === category;
    const queryMatch = !q || [v.title,v.summary,v.category,v.type].some(x => x.toLowerCase().includes(q));
    return categoryMatch && queryMatch;
  }), [category,query]);

  const current = videos.find(v => v.id === selected) || videos[0];
  const progress = Math.round((watched.length / videos.length) * 100);

  const persistWatched = (next:number[]) => {
    setWatched(next);
    if (typeof window !== "undefined") localStorage.setItem("pxm-watched", JSON.stringify(next));
  };
  const persistSaved = (next:number[]) => {
    setSaved(next);
    if (typeof window !== "undefined") localStorage.setItem("pxm-saved", JSON.stringify(next));
  };
  const openVideo = (id:number) => {
    setSelected(id);
    setPage("videos");
    if (!watched.includes(id)) persistWatched([...watched,id]);
  };
  const toggleSave = (id:number) => persistSaved(saved.includes(id) ? saved.filter(x => x !== id) : [...saved,id]);
  const move = (delta:number) => {
    const i = videos.findIndex(v => v.id === selected);
    const next = videos[(i + delta + videos.length) % videos.length];
    openVideo(next.id);
  };

  return (
    <div className="pxm-app">
      <header className="pxm-topbar">
        <button className="pxm-brand" onClick={() => setPage("home")} aria-label="Ir para início">
          <span className="pxm-brand-mark"><Sparkles size={16}/></span>
          <span><b>POLÍTICA EM</b><strong>X MINUTOS</strong></span>
        </button>
        <div className="pxm-search">
          <Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar candidato, tema ou acontecimento..."/>
          {query && <button onClick={()=>setQuery("")} aria-label="Limpar busca"><X size={15}/></button>}
        </div>
        <div className="pxm-top-actions">
          <button className="pxm-mobile-menu" onClick={()=>setMenu(!menu)}><Menu size={20}/></button>
          <button className="pxm-profile-chip" onClick={()=>setPage("profile")}><span>TG</span><b>Meu perfil</b></button>
        </div>
      </header>

      {menu && <div className="pxm-mobile-nav"><Nav page={page} go={p=>{setPage(p);setMenu(false)}}/></div>}

      <div className="pxm-layout">
        <aside className="pxm-sidebar">
          <Nav page={page} go={setPage}/>
          <div className="pxm-sidebar-bottom">
            <div className="pxm-update"><i/><div><b>Atualização diária</b><span>Hoje · 04/09/2026</span></div></div>
            <button className="pxm-nav-item" onClick={()=>setPage("admin")}><LayoutDashboard size={18}/> Administração</button>
          </div>
        </aside>

        <main className="pxm-main">
          {page==="home" && <Home progress={progress} watched={watched} open={openVideo} query={query} results={filtered} setCategory={setCategory}/>}
          {page==="videos" && <Player video={current} watched={watched.includes(current.id)} saved={saved.includes(current.id)} save={()=>toggleSave(current.id)} mark={()=>watched.includes(current.id)?undefined:persistWatched([...watched,current.id])} back={()=>setPage("home")} next={()=>move(1)} prev={()=>move(-1)}/>}
          {page==="summary" && <Summary watched={watched}/>}
          {page==="saved" && <Saved ids={saved} open={openVideo}/>}
          {page==="profile" && <Profile watched={watched} saved={saved} clear={()=>{persistWatched([]);persistSaved([])}}/>}
          {page==="admin" && <Admin/>}
        </main>
      </div>
    </div>
  );
}

function Nav({page,go}:{page:Page;go:(p:Page)=>void}) {
  const items:[Page,ReactNode,string][] = [
    ["home",<Home size={18}/>,"Início"],["videos",<CirclePlay size={18}/>,"Vídeos"],
    ["summary",<Flame size={18}/>,"Resumo do dia"],["saved",<Bookmark size={18}/>,"Salvos"],["profile",<User size={18}/>,"Meu perfil"]
  ];
  return <nav className="pxm-nav">{items.map(([p,icon,label])=><button key={p} className={"pxm-nav-item "+(page===p?"active":"")} onClick={()=>go(p)}>{icon}{label}</button>)}</nav>;
}

function Home({progress,watched,open,query,results,setCategory}:{progress:number;watched:number[];open:(id:number)=>void;query:string;results:VideoItem[];setCategory:(c:Category)=>void}) {
  const remaining = videos.length - watched.length;
  return <div className="pxm-home">
    <section className="pxm-hero">
      <div className="pxm-hero-copy">
        <div className="pxm-live"><i/> NOVA ATUALIZAÇÃO DISPONÍVEL</div>
        <span className="pxm-eyebrow">SEXTA-FEIRA, 04 DE SETEMBRO</span>
        <h1>Fique por dentro da política.<br/><em>Em X minutos.</em></h1>
        <p>Os acontecimentos presidenciais que realmente importam, resumidos em vídeos curtos e objetivos.</p>
        <div className="pxm-actions">
          <button className="pxm-primary" onClick={()=>open(videos.find(v=>!watched.includes(v.id))?.id || 1)}><Play size={16} fill="currentColor"/> Começar agora</button>
          <button className="pxm-ghost" onClick={()=>open(1)}>Ver destaque <ChevronRight size={16}/></button>
        </div>
      </div>
      <div className="pxm-hero-score">
        <div className="pxm-score-ring"><strong>{progress}%</strong><span>do dia</span></div>
        <small>{remaining ? "Faltam "+remaining+" vídeos" : "Você já está atualizado."}</small>
      </div>
    </section>

    <section className="pxm-progress-card">
      <div><span>SEU DIA</span><strong>{watched.length} de {videos.length} vídeos assistidos</strong></div>
      <div className="pxm-progress"><i style={{width:progress+"%"}}/></div>
      <b>{remaining ? "Faltam "+remaining+" para você ficar por dentro de tudo." : "Você já está atualizado."}</b>
    </section>

    <section className="pxm-section">
      <div className="pxm-section-head"><div><span>CURADORIA EDITORIAL</span><h2>{query ? `Resultados para "${query}"` : "Principais notícias de hoje"}</h2></div><button className="pxm-text-btn" onClick={()=>open(1)}>Ver todos <ChevronRight size={15}/></button></div>
      {results.length ? <div className="pxm-grid">{results.slice(0,6).map(v=><NewsCard key={v.id} video={v} watched={watched.includes(v.id)} open={()=>open(v.id)}/>)}</div> : <Empty title="Nada encontrado" text="Tente outro nome, tema ou acontecimento."/>}
    </section>

    <section className="pxm-section">
      <div className="pxm-section-head"><div><span>EXPLORE</span><h2>Por categoria</h2></div><Filter size={18}/></div>
      <div className="pxm-category-grid">{categories.slice(1).map((c,i)=><button key={c} onClick={()=>setCategory(c)}><small>{String(i+1).padStart(2,"0")}</small><b>{c}</b><ChevronRight size={16}/></button>)}</div>
    </section>

    <section className="pxm-missed">
      <div className="pxm-missed-icon"><History size={19}/></div>
      <div><span>O QUE VOCÊ PERDEU</span><h3>{remaining ? "Você ainda não viu "+remaining+" acontecimentos importantes de hoje." : "Você não perdeu nada importante hoje."}</h3><p>Seu progresso é salvo automaticamente neste dispositivo.</p></div>
      <button className="pxm-ghost" onClick={()=>open(videos.find(v=>!watched.includes(v.id))?.id || 1)}>Continuar <ChevronRight size={15}/></button>
    </section>
  </div>;
}

function NewsCard({video,watched,open}:{video:VideoItem;watched:boolean;open:()=>void}) {
  return <article className={"pxm-news-card "+(video.featured?"featured":"")} onClick={open}>
    <div className="pxm-card-art"><span className="pxm-category-tag">{video.category}</span><div className="pxm-art-orb"><Play size={17} fill="currentColor"/></div><span className="pxm-duration">{video.duration}</span>{watched&&<span className="pxm-seen"><Check size={11}/> VISTO</span>}</div>
    <div className="pxm-card-body"><div className="pxm-meta">{video.time}<i/> {video.type}</div><h3>{video.title}</h3><p>{video.summary}</p></div>
  </article>;
}

function Player({video,watched,saved,save,mark,back,next,prev}:{video:VideoItem;watched:boolean;saved:boolean;save:()=>void;mark:()=>void;back:()=>void;next:()=>void;prev:()=>void}) {
  const [muted,setMuted] = useState(true);
  const [playing,setPlaying] = useState(false);
  const [sources,setSources] = useState(false);

  return <div className="pxm-player-page">
    <div className="pxm-feed-head"><button onClick={back}><ArrowLeft size={18}/></button><div><span>EDIÇÃO DE HOJE</span><b>POLÍTICA EM X MINUTOS</b></div><strong>{video.id} / {videos.length}</strong></div>
    <div className="pxm-stage">
      <button className="pxm-arrow left" onClick={prev} aria-label="Vídeo anterior"><ArrowLeft size={18}/></button>
      <div className="pxm-video">
        <div className="pxm-video-grid"/><div className="pxm-video-glow"/>
        <div className="pxm-video-top"><span>{video.category}</span><span><Clock3 size={13}/> {video.duration}</span></div>
        <div className="pxm-video-center"><button onClick={()=>setPlaying(!playing)} aria-label={playing?"Pausar":"Reproduzir"}>{playing?<Pause size={24} fill="currentColor"/>:<Play size={24} fill="currentColor"/>}</button><small>{playing?"REPRODUZINDO":"VÍDEO DA EDIÇÃO"}</small></div>
        <div className="pxm-video-overlay"><span className="pxm-story-type">{video.type}</span><h1>{video.title}</h1><p>{video.summary}</p><div className="pxm-video-actions"><button onClick={mark}><Check size={16}/> {watched?"Visto":"Marcar como visto"}</button><button onClick={save}><Bookmark size={16} fill={saved?"currentColor":"none"}/> {saved?"Salvo":"Salvar"}</button><button onClick={()=>setMuted(!muted)}>{muted?<VolumeX size={16}/>:<Volume2 size={16}/>}</button><button onClick={()=>navigator.share?.({title:video.title,text:video.summary}).catch(()=>undefined)}><Share2 size={16}/></button></div></div>
        <div className="pxm-video-progress"><i style={{width:watched?"100%":"34%"}}/></div>
      </div>
      <button className="pxm-arrow right" onClick={next} aria-label="Próximo vídeo"><ArrowRight size={18}/></button>
    </div>
    <div className="pxm-source-panel"><button className="pxm-source-toggle" onClick={()=>setSources(!sources)}><div><span>TRANSPARÊNCIA</span><b>Fontes desta informação</b></div><ChevronRight className={sources?"rotate":""} size={19}/></button>{sources&&<div className="pxm-source-body"><div><Check size={15}/><div><b>{video.source.vehicle}</b><span>{video.source.title}</span><small>{video.source.date}</small></div><a href={video.source.url} target="_blank" rel="noreferrer">Abrir <ExternalLink size={13}/></a></div><p>Este conteúdo deve distinguir fato, contexto, análise e projeção. Substitua a fonte de exemplo pela fonte original antes de publicar.</p></div>}</div>
  </div>;
}

function Summary({watched}:{watched:number[]}) {
  return <div className="pxm-page"><PageHeader eyebrow="EDIÇÃO DIÁRIA" title="Resumo do dia" text="Uma visão rápida dos acontecimentos que dominaram a política presidencial."/>
    <div className="pxm-summary-grid"><div className="pxm-summary-main"><span className="pxm-label">O QUE IMPORTA</span><h2>8 acontecimentos para você começar o dia informado.</h2><p>Use esta página como uma leitura rápida antes ou depois de assistir aos vídeos. O vídeo continua sendo a experiência principal.</p></div><div className="pxm-stat"><strong>{watched.length}</strong><span>vídeos vistos</span></div><div className="pxm-stat"><strong>{videos.length-watched.length}</strong><span>ainda pendentes</span></div></div>
    <div className="pxm-summary-list">{videos.map((v,i)=><div key={v.id}><span>{String(i+1).padStart(2,"0")}</span><div><b>{v.title}</b><small>{v.category} · {v.type}</small></div><button onClick={()=>undefined}><ChevronRight size={17}/></button></div>)}</div>
    <div className="pxm-note"><Sparkles size={18}/><div><b>Transparência editorial</b><p>Fatos, contexto, análise e projeções devem ser identificados separadamente. As fontes originais ficam disponíveis dentro de cada conteúdo.</p></div></div>
  </div>;
}

function Saved({ids,open}:{ids:number[];open:(id:number)=>void}) {
  const list=videos.filter(v=>ids.includes(v.id));
  return <div className="pxm-page"><PageHeader eyebrow="SUA BIBLIOTECA" title="Vídeos salvos" text="Conteúdos que você escolheu rever mais tarde."/>
    {list.length?<div className="pxm-grid">{list.map(v=><NewsCard key={v.id} video={v} watched={true} open={()=>open(v.id)}/>)}</div>:<Empty title="Sua biblioteca está vazia" text="Salve um vídeo no player para encontrá-lo aqui depois."/>}
  </div>;
}

function Profile({watched,saved,clear}:{watched:number[];saved:number[];clear:()=>void}) {
  const [prefs,setPrefs]=useState<string[]>(["ELEIÇÕES","PESQUISAS","CANDIDATOS"]);
  const toggle=(x:string)=>setPrefs(p=>p.includes(x)?p.filter(y=>y!==x):[...p,x]);
  return <div className="pxm-page"><PageHeader eyebrow="CONTA" title="Meu perfil" text="Seu histórico, preferências e progresso em um só lugar."/>
    <div className="pxm-profile-grid"><div className="pxm-profile-card"><div className="pxm-avatar">TG</div><div><b>Seu perfil</b><span>Leitor de política</span></div><button className="pxm-icon-btn"><Settings size={17}/></button></div><div className="pxm-stat"><strong>{watched.length}</strong><span>assistidos</span></div><div className="pxm-stat"><strong>{saved.length}</strong><span>salvos</span></div></div>
    <section className="pxm-preferences"><span className="pxm-label">TEMAS PRIORITÁRIOS</span><h2>O que você quer acompanhar?</h2><div>{categories.slice(1).map(c=><button key={c} className={prefs.includes(c)?"selected":""} onClick={()=>toggle(c)}>{prefs.includes(c)&&<Check size={14}/>} {c}</button>)}</div></section>
    <button className="pxm-danger" onClick={clear}>Limpar histórico e salvos</button>
  </div>;
}

function Admin() {
  const [notice,setNotice]=useState("");
  const publish=()=>{setNotice("Rascunho criado localmente. Conecte seu banco/API para publicar para todos os usuários.");setTimeout(()=>setNotice(""),3500)};
  return <div className="pxm-page"><PageHeader eyebrow="ÁREA PROTEGIDA" title="Administração" text="Central de gestão editorial e acompanhamento do produto."/>
    <div className="pxm-admin-stats">{[["08","Vídeos publicados"],["01.284","Visualizações"],["72%","Conclusão média"],["04:32","Tempo médio"]].map(([n,l])=><div className="pxm-admin-stat" key={l}><strong>{n}</strong><span>{l}</span></div>)}</div>
    <div className="pxm-admin-layout"><section className="pxm-admin-card"><div className="pxm-card-head"><div><span>CONTEÚDO</span><h2>Publicar novo vídeo</h2></div><button className="pxm-primary" onClick={publish}><Sparkles size={15}/> Criar conteúdo</button></div><div className="pxm-form-grid"><label>Manchete<input placeholder="Título do vídeo"/></label><label>Categoria<select defaultValue="PRESIDENTE">{categories.map(c=><option key={c}>{c}</option>)}</select></label><label className="wide">Resumo<textarea placeholder="Explique em poucas linhas o que o usuário precisa saber."/></label><label>Tipo<select defaultValue="FATO"><option>FATO</option><option>CONTEXTO</option><option>ANÁLISE</option><option>PROJEÇÃO</option></select></label><label>URL do vídeo<input placeholder="https://..."/></label><label className="wide">Fonte original<input placeholder="https://fonte-original.com/materia"/></label></div>{notice&&<div className="pxm-toast"><Check size={16}/>{notice}</div>}</section>
      <section className="pxm-admin-card"><div className="pxm-card-head"><div><span>DESEMPENHO</span><h2>Conteúdos mais assistidos</h2></div></div><div className="pxm-ranking">{videos.slice(0,5).map((v,i)=><div key={v.id}><b>{String(i+1).padStart(2,"0")}</b><span>{v.title}</span><strong>{[284,219,187,164,132][i]}</strong></div>)}</div></section>
    </div>
  </div>;
}

function PageHeader({eyebrow,title,text}:{eyebrow:string;title:string;text:string}) {
  return <div className="pxm-page-head"><span>{eyebrow}</span><h1>{title}</h1><p>{text}</p></div>;
}
function Empty({title,text}:{title:string;text:string}) {
  return <div className="pxm-empty"><CirclePlay size={24}/><h3>{title}</h3><p>{text}</p></div>;
}
