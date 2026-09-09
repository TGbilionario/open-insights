export type VerificationSource = {
  title: string;
  source: string;
  url: string;
  publishedAt?: string;
};

const GOOGLE_NEWS_RSS = "https://news.google.com/rss/search";

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value: string): string {
  return decodeXml(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseRss(xml: string): VerificationSource[] {
  const items: VerificationSource[] = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];

  for (const block of blocks.slice(0, 8)) {
    const title = block.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
    const link = block.match(/<link>([\s\S]*?)<\/link>/i)?.[1];
    const source = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1];
    const published = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1];

    const cleanTitle = stripHtml(title ?? "");
    const cleanLink = decodeXml((link ?? "").trim());
    const cleanSource = stripHtml(source ?? "Google News");

    if (cleanTitle && cleanLink.startsWith("http")) {
      items.push({
        title: cleanTitle,
        source: cleanSource || "Google News",
        url: cleanLink,
        publishedAt: published ? stripHtml(published) : undefined,
      });
    }
  }

  return items;
}

async function fetchRss(query: string): Promise<VerificationSource[]> {
  const url =
    `${GOOGLE_NEWS_RSS}?q=${encodeURIComponent(query)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;

  try {
    const response = await fetch(url, {
      headers: { "user-agent": "OpenInsights/1.0 source-verification" },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return [];
    return parseRss(await response.text());
  } catch {
    return [];
  }
}

export async function collectVerificationSources(question: string): Promise<VerificationSource[]> {
  const queries = [
    question,
    `${question} site:tse.jus.br`,
    `${question} site:senado.leg.br OR site:camara.leg.br`,
    `${question} site:gov.br OR site:stf.jus.br`,
  ];

  const results = await Promise.all(queries.map(fetchRss));
  const seen = new Set<string>();
  const merged: VerificationSource[] = [];

  for (const source of results.flat()) {
    const key = source.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(source);
  }

  return merged.slice(0, 12);
}

export function formatVerificationSources(sources: VerificationSource[]): string {
  if (!sources.length) {
    return "Nenhuma fonte pública foi recuperada automaticamente nesta execução. Marque fatos atuais como não verificados.";
  }

  return sources
    .map((source, index) => {
      const date = source.publishedAt ? ` | ${source.publishedAt}` : "";
      return `${index + 1}. ${source.source} — ${source.title}${date} — ${source.url}`;
    })
    .join("\n");
}
