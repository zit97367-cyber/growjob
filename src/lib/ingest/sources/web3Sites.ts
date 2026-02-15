import { createHash } from "node:crypto";
import { fetchTextSafe } from "@/lib/ingest/sources/http";
import { UnifiedJob } from "@/lib/ingest/types";

type Web3SourceConfig = {
  source: UnifiedJob["source"];
  sourceName: string;
  websiteDomain: string;
  feedUrls?: string[];
  listUrl?: string;
};

type RssItem = {
  title: string;
  link: string;
  description: string | null;
  pubDate: string | null;
};

const SOURCE_CONFIGS: Web3SourceConfig[] = [
  {
    source: "CRYPTOJOBSLIST",
    sourceName: "CryptoJobsList",
    websiteDomain: "cryptojobslist.com",
    feedUrls: ["https://cryptojobslist.com/feed", "https://cryptojobslist.com/rss"],
    listUrl: "https://cryptojobslist.com/",
  },
  {
    source: "WEB3_CAREER",
    sourceName: "Web3.career",
    websiteDomain: "web3.career",
    feedUrls: ["https://web3.career/feed", "https://web3.career/rss"],
    listUrl: "https://web3.career/",
  },
  {
    source: "SOLANA_JOBS",
    sourceName: "Solana Jobs",
    websiteDomain: "jobs.solana.com",
    feedUrls: ["https://jobs.solana.com/jobs/rss", "https://jobs.solana.com/feed"],
    listUrl: "https://jobs.solana.com/jobs",
  },
  {
    source: "PLEXUS",
    sourceName: "Plexus",
    websiteDomain: "plexusrs.com",
    feedUrls: ["https://plexusrs.com/jobs/feed", "https://plexusrs.com/feed"],
    listUrl: "https://plexusrs.com/jobs",
  },
  {
    source: "CRYPTO_DOT_JOBS",
    sourceName: "Crypto.jobs",
    websiteDomain: "crypto.jobs",
    feedUrls: ["https://crypto.jobs/feed", "https://crypto.jobs/rss"],
    listUrl: "https://crypto.jobs/",
  },
  {
    source: "CRYPTOCURRENCYJOBS",
    sourceName: "CryptocurrencyJobs",
    websiteDomain: "cryptocurrencyjobs.co",
    feedUrls: ["https://cryptocurrencyjobs.co/feed", "https://cryptocurrencyjobs.co/rss"],
    listUrl: "https://cryptocurrencyjobs.co/",
  },
  {
    source: "BASE_HIRECHAIN",
    sourceName: "Base Ecosystem Jobs",
    websiteDomain: "base.hirechain.io",
    listUrl: "https://base.hirechain.io/jobs",
  },
  {
    source: "SUPERTEAM",
    sourceName: "Superteam Talent",
    websiteDomain: "talent.superteam.fun",
    listUrl: "https://talent.superteam.fun/",
  },
];

function hashId(source: string, raw: string) {
  return createHash("sha256").update(`${source}:${raw}`).digest("hex").slice(0, 24);
}

function decodeEntities(input: string) {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function extractTagContent(block: string, tag: string): string | null {
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = block.match(pattern);
  if (!match) return null;
  return decodeEntities(match[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim());
}

function parseRssItems(xml: string): RssItem[] {
  const itemBlocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];
  return itemBlocks.map((block) => ({
    title: extractTagContent(block, "title") ?? "",
    link: extractTagContent(block, "link") ?? "",
    description: extractTagContent(block, "description"),
    pubDate: extractTagContent(block, "pubDate"),
  }));
}

function normalizeCompany(sourceName: string, title: string) {
  const chunks = title.split(" at ");
  if (chunks.length >= 2) return chunks[chunks.length - 1]?.trim() || sourceName;
  return sourceName;
}

function normalizeTitle(title: string) {
  return title.replace(/\s+at\s+.+$/i, "").trim() || title.trim();
}

function safeIsoDate(value: string | null) {
  if (!value) return null;
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) return null;
  return new Date(ts).toISOString();
}

function parseHtmlLinks(html: string, baseUrl: string): Array<{ title: string; link: string }> {
  const matches = html.match(/<a\b[^>]*href=["'][^"']+["'][^>]*>[\s\S]*?<\/a>/gi) ?? [];
  const links = new Map<string, { title: string; link: string }>();
  for (const block of matches) {
    const href = block.match(/href=["']([^"']+)["']/i)?.[1]?.trim();
    if (!href) continue;
    const rawText = decodeEntities(block.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    if (!rawText) continue;
    const jobish = /job|engineer|developer|manager|designer|analyst|marketing|solidity|blockchain|crypto|web3/i;
    if (!jobish.test(`${href} ${rawText}`)) continue;

    let link: string;
    try {
      link = new URL(href, baseUrl).toString();
    } catch {
      continue;
    }
    if (links.has(link)) continue;
    links.set(link, { title: rawText, link });
    if (links.size >= 120) break;
  }
  return [...links.values()];
}

async function fromRss(config: Web3SourceConfig): Promise<UnifiedJob[]> {
  const urls = config.feedUrls ?? [];
  for (const feedUrl of urls) {
    const xml = await fetchTextSafe(feedUrl);
    if (!xml || !/<rss|<feed/i.test(xml)) continue;
    const items = parseRssItems(xml);
    if (items.length === 0) continue;
    return items
      .filter((item) => item.link)
      .map((item) => {
        const title = normalizeTitle(item.title || "Untitled role");
        const company = normalizeCompany(config.sourceName, item.title || "");
        return {
          id: `${config.source.toLowerCase()}-${hashId(config.source, item.link)}`,
          title,
          company,
          location: null,
          remote: null,
          description: item.description ?? null,
          applyUrl: item.link,
          postedAt: safeIsoDate(item.pubDate),
          firstSeenAt: new Date().toISOString(),
          source: config.source,
          sourceName: config.sourceName,
          sourceUrl: feedUrl,
          websiteDomain: config.websiteDomain,
        } satisfies UnifiedJob;
      });
  }
  return [];
}

async function fromHtml(config: Web3SourceConfig): Promise<UnifiedJob[]> {
  if (!config.listUrl) return [];
  const html = await fetchTextSafe(config.listUrl);
  if (!html) return [];
  const links = parseHtmlLinks(html, config.listUrl);
  return links.map((item) => ({
    id: `${config.source.toLowerCase()}-${hashId(config.source, item.link)}`,
    title: item.title,
    company: config.sourceName,
    location: null,
    remote: null,
    description: null,
    applyUrl: item.link,
    postedAt: null,
    firstSeenAt: new Date().toISOString(),
    source: config.source,
    sourceName: config.sourceName,
    sourceUrl: config.listUrl,
    websiteDomain: config.websiteDomain,
  }));
}

export async function fetchWeb3SitesJobs(): Promise<UnifiedJob[]> {
  const results = await Promise.all(
    SOURCE_CONFIGS.map(async (config) => {
      const rssJobs = await fromRss(config);
      if (rssJobs.length > 0) return rssJobs;
      return fromHtml(config);
    }),
  );
  return results.flat();
}
