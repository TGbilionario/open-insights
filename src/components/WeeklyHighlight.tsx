import { ArrowRight, CalendarDays, Flame, Play, Sparkles } from "lucide-react";

type WeeklyHighlightProps = {
  title?: string;
  description?: string;
  shorts?: { id: number; title: string; duration: string }[];
  weekLabel?: string;
  onOpenShort?: (id: number) => void;
};

export function WeeklyHighlight({
  title = "O assunto que dominou a semana",
  description = "Uma seleção especial de Shorts para entender o fato que mais repercutiu na política brasileira.",
  shorts = [
    { id: 1, title: "O que aconteceu?", duration: "00:48" },
    { id: 2, title: "Onde está o conflito?", duration: "00:55" },
    { id: 3, title: "O que está em jogo?", duration: "00:51" },
    { id: 4, title: "E agora?", duration: "00:44" },
  ],
  weekLabel = "DESTAQUE DA SEMANA",
  onOpenShort,
}: WeeklyHighlightProps) {
  return (
    <section className="pxm-weekly-highlight" aria-label="Destaque da semana">
      <div className="pxm-weekly-copy">
        <div className="pxm-weekly-kicker">
          <span><Flame size={13} /> {weekLabel}</span>
          <small><CalendarDays size={12} /> Publicado aos domingos</small>
        </div>
        <h2>{title}</h2>
        <p>{description}</p>
        <div className="pxm-weekly-meta">
          <Sparkles size={14} />
          <span>Especial editorial · 4 Shorts</span>
        </div>
      </div>

      <div className="pxm-weekly-shorts">
        {shorts.map((short, index) => (
          <button
            key={short.id}
            className={`pxm-weekly-short ${index === 0 ? "is-main" : ""}`}
            onClick={() => onOpenShort?.(short.id)}
          >
            <span className="pxm-weekly-number">{String(index + 1).padStart(2, "0")}</span>
            <span className="pxm-weekly-play"><Play size={14} fill="currentColor" /></span>
            <span className="pxm-weekly-short-copy">
              <b>{short.title}</b>
              <small>{short.duration}</small>
            </span>
            <ArrowRight size={15} />
          </button>
        ))}
      </div>
    </section>
  );
}
