import { ArrowRight, CalendarDays, Flame, Play, Sparkles } from "lucide-react";

type DailyHighlightProps = {
  dateLabel?: string;
  title?: string;
  summary?: string;
  duration?: string;
  onOpen?: () => void;
};

export function DailyHighlight({
  dateLabel = "07/09/2026",
  title = "A notícia que marcou o dia",
  summary = "O principal acontecimento político selecionado pela nossa curadoria depois do fechamento do noticiário.",
  duration = "01:30",
  onOpen,
}: DailyHighlightProps) {
  return (
    <section className="pxm-daily-highlight" aria-label={"Destaque do dia " + dateLabel}>
      <div className="pxm-daily-highlight-head">
        <div className="pxm-daily-highlight-label">
          <Flame size={14} />
          <span>DESTAQUE DO DIA</span>
        </div>
        <span className="pxm-daily-highlight-date"><CalendarDays size={13} /> {dateLabel}</span>
      </div>
      <div className="pxm-daily-highlight-content">
        <div className="pxm-daily-highlight-art">
          <span>VÍDEO ESPECIAL</span>
          <button onClick={onOpen} aria-label="Assistir vídeo especial do destaque do dia">
            <Play size={22} fill="currentColor" />
          </button>
          <small>{duration}</small>
        </div>
        <div className="pxm-daily-highlight-copy">
          <span className="pxm-daily-highlight-kicker"><Sparkles size={13} /> O QUE MAIS REPERCUTIU</span>
          <h2>{title}</h2>
          <p>{summary}</p>
          <button className="pxm-daily-highlight-cta" onClick={onOpen}>
            Assistir vídeo especial <ArrowRight size={15} />
          </button>
          <small className="pxm-daily-highlight-note">Fechamento editorial entre 23h30 e 00h00 · publicação às 07h00</small>
        </div>
      </div>
    </section>
  );
}
