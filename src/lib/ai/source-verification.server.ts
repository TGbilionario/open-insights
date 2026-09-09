export type VerificationSource = {
  title: string;
  source: string;
  url: string;
  publishedAt?: string;
  authority: "official" | "journalistic" | "other";
  sourceType: "TSE" | "Senado" | "Câmara" | "STF" | "Governo" | "Imprensa" | "Outro";
};

const GOOGLE_NEWS_RSS = "https://news.google.com/rss/search";
const OFFICIAL_HOSTS: Record<string, { authority: VerificationSource["authority"]; sourceType: VerificationSource["sourceType"] }> = {
  "tse.jus.br": { authority: "official", sourceType: "TSE" },
  "senado.leg.br": { authority: "official", sourceType: "Senado" },
  "camara.leg.br": { authority: "official", sourceType: "Câmara" },
  "stf.jus.br": { authority: "official", sourceType: "STF" },
  "gov.br": { authority: "official", sourceType: "Governo" },
};

function decodeXml(value: string): string {
  return value
    .replace(/<!\\[CDATA\\[(.*?)\\]\\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value: string): string {
  return decodeXml(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function classifyUrl(url: string, sourceName: string): Pick<VerificationSource, "authority" | "sourceType"> {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    const exact = OFFICIAL_HOSTS[hostname];
    if (exact) return exact;
    const official = Object.entries(OFFICIAL_HOSTS).find(([host]) => hostname.endsWith("." + host));
    if (official) return official[1];
  } catch {
    // Keep fallback classification below.
  }

  const normalized = sourceName.toLowerCase();
  if (normalized.includes("tse")) return { authority: "official", sourceType: "TSE" };
  if (normalized.includes("senado")) return { authority: "official", sourceType: "Senado" };
  if (normalized.includes("câmara") || normalized.includes("camara")) return { authority: "official", sourceType: "Câmara" };
  if (normalized.includes("stf")) return { authority: "official", sourceType: "STF" };
  if (normalized.includes("governo") || normalized.includes("presidência") || normalized.includes("presidencia")) return { authority: "official", sourceType: "Governo" };
  return { authority: "journalistic", sourceType: "Imprensa" };
}

function parseRss(xml: string): VerificationSource[] {
  const items: VerificationSource[] = [];
  const blocks = xml.match(/<item[\\s\\S]*?<\\/item>/gi) ?? [];

  for (const block of blocks.slice(0, 10)) {
    const title = block.match(/<title>([\\s\\S]*?)<\\/title>/i)?.[1];
    const link = block.match(/<link>([\\s\\S]*?)<\\/link>/i)?.[1];
    const source = block.match(/<source[^>]*>([\\s\\S]*?)<\\/source>/i)?.[1];
    const published = block.match(/<pubDate>([\\s\\S]*?)<\\/pubDate>/i)?.[1];

    const cleanTitle = stripHtml(title ?? "");
    const cleanLink = decodeXml((link ?? "").trim());
    const cleanSource = stripHtml(source ?? "Google News");

    if (cleanTitle && cleanLink.startsWith("http")) {
      const classification = classifyUrl(cleanLink, cleanSource);
      const item: VerificationSource = {
        title: cleanTitle,
        source: cleanSource || "Google News",
        url: cleanLink,
        ...classification,
      };
      if (published) item.publishedAt = stripHtml(published);
      items.push(item);
    }
  }

  return items;
}

async function fetchRss(query: string): Promise<VerificationSource[]> {
  const url =
    GOOGLE_NEWS_RSS +
    "?q=" + encodeURIComponent(query) +
    "&hl=pt-BR&gl=BR&ceid=BR:pt-419";

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
  const year = new Date().getFullYear();
  const queries = [
    question + " " + year,
    question + " " + year + " site:tse.jus.br",
    question + " " + year + " site:senado.leg.br OR site:camara.leg.br",
    question + " " + year + " site:gov.br OR site:stf.jus.br",
  ];

  const results = await Promise.all(queries.map(fetchRss));
  const seen = new Set<string>();
  const merged: VerificationSource[] = [];

  for (const source of results.flat()) {
    const key = source.url.toLowerCase().replace(/#.*$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(source);
  }

  merged.sort((a, b) => {
    if (a.authority === "official" && b.authority !== "official") return -1;
    if (a.authority !== "official" && b.authority === "official") return 1;
    return 0;
  });

  return merged.slice(0, 16);
}

export function formatVerificationSources(sources: VerificationSource[]): string {
  if (!sources.length) {
    return "Nenhuma fonte pública foi recuperada automaticamente nesta execução. Marque fatos atuais como não verificados.";
  }

  return sources
    .map((source, index) => {
      const date = source.publishedAt ? " | " + source.publishedAt : "";
      return (
        (index + 1) +
        ". [" + source.authority.toUpperCase() + "][" + source.sourceType + "] " +
        source.source +
        " — " +
        source.title +
        date +
        " — " +
        source.url
      );
    })
    .join("\n");
}
