import * as cheerio from "cheerio";
import pLimit from "p-limit";
import type { CrawlData, InternalLink, PageData, ResourceFetch } from "./types";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_FOLLOW_UP_PAGES = 5;
const USER_AGENT =
  "AI-Commerce-Discoverability-Audit/1.0 (+https://github.com/agent-commerce-optimizer)";

const RELEVANCE_KEYWORDS = [
  "pricing",
  "price",
  "plans",
  "shipping",
  "delivery",
  "return",
  "refund",
  "contact",
  "support",
  "cart",
  "checkout",
  "bag",
  "api",
  "developer",
  "docs",
  "documentation",
  "faq",
  "about",
  "product",
  "shop",
  "store",
];

function normalizeInputUrl(input: string): URL {
  const trimmed = input.trim();
  const withProtocol =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;
  return new URL(withProtocol);
}

function resolveHref(href: string, baseUrl: string): string | null {
  try {
    const resolved = new URL(href, baseUrl);
    if (!["http:", "https:"].includes(resolved.protocol)) {
      return null;
    }
    resolved.hash = "";
    return resolved.href;
  } catch {
    return null;
  }
}

function isSameOrigin(url: string, origin: string): boolean {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}

function extractSchemaTypes(data: unknown): string[] {
  const types = new Set<string>();

  function walk(value: unknown): void {
    if (!value || typeof value !== "object") return;

    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }

    const record = value as Record<string, unknown>;
    const typeField = record["@type"];

    if (typeof typeField === "string") {
      types.add(typeField);
    } else if (Array.isArray(typeField)) {
      typeField.forEach((entry) => {
        if (typeof entry === "string") types.add(entry);
      });
    }

    if (record["@graph"]) walk(record["@graph"]);

    for (const nested of Object.values(record)) {
      if (nested && typeof nested === "object") {
        walk(nested);
      }
    }
  }

  walk(data);
  return [...types];
}

function parseJsonLdBlocks(rawBlocks: string[]): {
  blocks: unknown[];
  schemaTypes: string[];
} {
  const blocks: unknown[] = [];
  const schemaTypes = new Set<string>();

  for (const raw of rawBlocks) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      blocks.push(parsed);
      extractSchemaTypes(parsed).forEach((type) => schemaTypes.add(type));
    } catch {
      // Skip invalid JSON-LD blocks
    }
  }

  return { blocks, schemaTypes: [...schemaTypes] };
}

function extractInternalLinks(
  $: cheerio.CheerioAPI,
  pageUrl: string,
  origin: string,
): InternalLink[] {
  const links: InternalLink[] = [];
  const seen = new Set<string>();

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;

    const resolved = resolveHref(href, pageUrl);
    if (!resolved || !isSameOrigin(resolved, origin)) return;
    if (seen.has(resolved)) return;

    seen.add(resolved);
    links.push({
      href: resolved,
      text: $(element).text().replace(/\s+/g, " ").trim(),
    });
  });

  return links;
}

function scoreLink(link: InternalLink): number {
  const haystack = `${link.href} ${link.text}`.toLowerCase();
  let score = 0;

  for (const keyword of RELEVANCE_KEYWORDS) {
    if (haystack.includes(keyword)) {
      score += 2;
    }
  }

  if (link.href.endsWith("/")) {
    score += 0.5;
  }

  return score;
}

function selectFollowUpLinks(
  pages: PageData[],
  entryUrl: string,
): string[] {
  const crawled = new Set(pages.map((page) => page.url));
  const candidates = new Map<string, number>();

  for (const page of pages) {
    for (const link of page.internalLinks) {
      if (crawled.has(link.href)) continue;
      if (link.href === entryUrl) continue;

      const score = scoreLink(link);
      if (score <= 0) continue;

      const existing = candidates.get(link.href) ?? 0;
      candidates.set(link.href, Math.max(existing, score));
    }
  }

  return [...candidates.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_FOLLOW_UP_PAGES)
    .map(([href]) => href);
}

async function fetchWithTimeout(
  url: string,
  accept = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: accept,
      },
      redirect: "follow",
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchResource(url: string): Promise<ResourceFetch> {
  try {
    const response = await fetchWithTimeout(
      url,
      "text/plain,application/xml,text/xml,*/*;q=0.8",
    );
    const contentType = response.headers.get("content-type");
    const content = response.ok ? await response.text() : null;

    return {
      url,
      status: response.status,
      content,
      contentType,
    };
  } catch (error) {
    return {
      url,
      status: null,
      content: null,
      contentType: null,
      error: error instanceof Error ? error.message : "Fetch failed",
    };
  }
}

async function fetchPage(url: string, origin: string): Promise<PageData> {
  try {
    const response = await fetchWithTimeout(url);
    const status = response.status;

    if (!response.ok) {
      return {
        url,
        title: null,
        metaDescription: null,
        jsonLdBlocks: [],
        schemaTypes: [],
        internalLinks: [],
        status,
        error: `HTTP ${status}`,
      };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return {
        url,
        title: null,
        metaDescription: null,
        jsonLdBlocks: [],
        schemaTypes: [],
        internalLinks: [],
        status,
        error: `Non-HTML content type: ${contentType}`,
      };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const title = $("title").first().text().replace(/\s+/g, " ").trim() || null;
    const metaDescription =
      $('meta[name="description"]').attr("content")?.trim() ||
      $('meta[property="og:description"]').attr("content")?.trim() ||
      null;

    const rawJsonLd = $('script[type="application/ld+json"]')
      .map((_, element) => $(element).html() ?? "")
      .get()
      .filter(Boolean);

    const { blocks, schemaTypes } = parseJsonLdBlocks(rawJsonLd);
    const internalLinks = extractInternalLinks($, url, origin);

    return {
      url,
      title,
      metaDescription,
      jsonLdBlocks: blocks,
      schemaTypes,
      internalLinks,
      status,
    };
  } catch (error) {
    return {
      url,
      title: null,
      metaDescription: null,
      jsonLdBlocks: [],
      schemaTypes: [],
      internalLinks: [],
      status: null,
      error: error instanceof Error ? error.message : "Fetch failed",
    };
  }
}

export async function crawlSite(inputUrl: string): Promise<CrawlData> {
  const entryUrlObj = normalizeInputUrl(inputUrl);
  const entryUrl = entryUrlObj.href;
  const origin = entryUrlObj.origin;

  const resourcePaths = {
    robotsTxt: `${origin}/robots.txt`,
    sitemapXml: `${origin}/sitemap.xml`,
    llmsTxt: `${origin}/llms.txt`,
    llmsFullTxt: `${origin}/llms-full.txt`,
  };

  const limit = pLimit(4);

  const [entryPage, robotsTxt, sitemapXml, llmsTxt, llmsFullTxt] =
    await Promise.all([
      fetchPage(entryUrl, origin),
      limit(() => fetchResource(resourcePaths.robotsTxt)),
      limit(() => fetchResource(resourcePaths.sitemapXml)),
      limit(() => fetchResource(resourcePaths.llmsTxt)),
      limit(() => fetchResource(resourcePaths.llmsFullTxt)),
    ]);

  const pages: PageData[] = [entryPage];
  const followUpUrls = selectFollowUpLinks(pages, entryUrl);

  if (followUpUrls.length > 0) {
    const followUpPages = await Promise.all(
      followUpUrls.map((url) => limit(() => fetchPage(url, origin))),
    );
    pages.push(...followUpPages);
  }

  return {
    entryUrl,
    origin,
    pages,
    resources: {
      robotsTxt,
      sitemapXml,
      llmsTxt,
      llmsFullTxt,
    },
    crawledAt: new Date().toISOString(),
  };
}
