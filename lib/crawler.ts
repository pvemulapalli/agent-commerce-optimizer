import * as cheerio from "cheerio";
import pLimit from "p-limit";
import { isSameOrigin } from "./domains";
import {
  extractDiscoveredLinks,
  scoreDiscoveredLink,
  selectRelatedDomainUrls,
  toInternalLinks,
} from "./link-extraction";
import { resolveHostingProfile } from "./hosting-profile";
import {
  prioritizeSitemapUrls,
  resolveSitemapUrls,
  SITEMAP_URL_LIMIT,
} from "./sitemap";
import type { CrawlData, PageData, ResourceFetch } from "./types";
import { formatFetchError } from "./gateway-errors";
import type { CrawlRequestContext } from "./crawl-request-context";
import { MERCHANT_SIGNALS_CRAWLER_USER_AGENT } from "./crawler-identity";
import { storefrontFetch } from "./storefront-fetch";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_LINK_FOLLOW_UP_PAGES = 5;
const MAX_RELATED_DOMAIN_PAGES = 10;
const USER_AGENT = MERCHANT_SIGNALS_CRAWLER_USER_AGENT;

const RELEVANCE_KEYWORDS = [
  "returns",
  "refund",
  "shipping",
  "faq",
  "help",
  "support",
  "contact",
  "policy",
  "cart",
  "checkout",
  "product",
  "products",
  "collections",
  "catalog",
  "pricing",
  "price",
  "delivery",
  "return",
  "bag",
  "shop",
  "store",
  "track",
  "order",
];

function normalizeInputUrl(input: string): URL {
  const trimmed = input.trim();
  const withProtocol =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;
  return new URL(withProtocol);
}

function normalizeCrawlHref(url: URL | string): string {
  const normalized = typeof url === "string" ? new URL(url) : new URL(url.href);
  normalized.hash = "";

  if (normalized.pathname !== "/" && normalized.pathname.endsWith("/")) {
    normalized.pathname = normalized.pathname.slice(0, -1);
  }

  return normalized.href;
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

function extractBodyText($: cheerio.CheerioAPI): string | null {
  $("script, style, noscript").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim();
  return text ? text.slice(0, 4000) : null;
}

function selectFollowUpLinks(pages: PageData[], entryUrl: string): string[] {
  const crawled = new Set(pages.map((page) => page.url));
  const candidates = new Map<string, number>();

  for (const page of pages) {
    for (const link of page.discoveredLinks) {
      if (link.scope !== "same-origin") continue;
      if (crawled.has(link.href)) continue;
      if (link.href === entryUrl) continue;

      const haystack = `${link.href} ${link.text}`.toLowerCase();
      let score = scoreDiscoveredLink(link);

      for (const keyword of RELEVANCE_KEYWORDS) {
        if (haystack.includes(keyword)) {
          score += 2;
        }
      }

      if (score <= 0) continue;

      const existing = candidates.get(link.href) ?? 0;
      candidates.set(link.href, Math.max(existing, score));
    }
  }

  return [...candidates.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_LINK_FOLLOW_UP_PAGES)
    .map(([href]) => href);
}

async function fetchWithTimeout(
  url: string,
  accept = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  context?: CrawlRequestContext,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await storefrontFetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: accept,
        ...(context?.cookieHeader ? { Cookie: context.cookieHeader } : {}),
      },
      redirect: "follow",
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchResource(
  url: string,
  context?: CrawlRequestContext,
): Promise<ResourceFetch> {
  try {
    const response = await fetchWithTimeout(
      url,
      "text/plain,application/xml,text/xml,*/*;q=0.8",
      context,
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
      error: formatFetchError(error),
    };
  }
}

async function fetchXml(url: string, context?: CrawlRequestContext): Promise<string | null> {
  const resource = await fetchResource(url, context);
  return resource.status === 200 && resource.content ? resource.content : null;
}

async function fetchPage(
  url: string,
  entryOrigin: string,
  entryUrl: string,
  context?: CrawlRequestContext,
): Promise<PageData> {
  try {
    const response = await fetchWithTimeout(url, undefined, context);
    const status = response.status;
    const pageUrl = normalizeCrawlHref(response.url || url);
    const effectiveOrigin =
      entryOrigin === "pending" ? new URL(pageUrl).origin : entryOrigin;
    const effectiveEntryUrl = entryUrl === "pending" ? pageUrl : entryUrl;
    const contentType = response.headers.get("content-type") ?? "";
    const isHtmlContent =
      contentType.includes("text/html") ||
      contentType.includes("application/xhtml") ||
      contentType === "";

    if (!response.ok) {
      let title: string | null = null;
      let bodyTextSnippet: string | null = null;
      let htmlSnippet: string | null = null;

      if (isHtmlContent) {
        const html = await response.text();
        htmlSnippet = html.slice(0, 12_000);
        const $ = cheerio.load(html);
        title = $("title").first().text().replace(/\s+/g, " ").trim() || null;
        bodyTextSnippet = extractBodyText($);
      }

      return {
        url: pageUrl,
        title,
        metaDescription: null,
        bodyTextSnippet,
        htmlSnippet,
        jsonLdBlocks: [],
        schemaTypes: [],
        discoveredLinks: [],
        internalLinks: [],
        status,
        error: `HTTP ${status}`,
      };
    }

    if (!isHtmlContent) {
      return {
        url: pageUrl,
        title: null,
        metaDescription: null,
        bodyTextSnippet: null,
        htmlSnippet: null,
        jsonLdBlocks: [],
        schemaTypes: [],
        discoveredLinks: [],
        internalLinks: [],
        status,
        error: `Non-HTML content type: ${contentType}`,
      };
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const nextDataScript = $("script#__NEXT_DATA__").html()?.slice(0, 50_000) ?? "";
    const htmlSnippet = `${html.slice(0, 12_000)}\n${nextDataScript}`;

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
    const discoveredLinks = extractDiscoveredLinks(
      $,
      pageUrl,
      effectiveOrigin,
      effectiveEntryUrl,
    );
    const bodyTextSnippet = extractBodyText($);

    return {
      url: pageUrl,
      title,
      metaDescription,
      bodyTextSnippet,
      htmlSnippet,
      jsonLdBlocks: blocks,
      schemaTypes,
      discoveredLinks,
      internalLinks: toInternalLinks(discoveredLinks),
      status,
    };
  } catch (error) {
    return {
      url: normalizeCrawlHref(url),
      title: null,
      metaDescription: null,
      bodyTextSnippet: null,
      htmlSnippet: null,
      jsonLdBlocks: [],
      schemaTypes: [],
      discoveredLinks: [],
      internalLinks: [],
      status: null,
      error: formatFetchError(error),
    };
  }
}

function mergePages(existing: PageData[], incoming: PageData[]): PageData[] {
  const byUrl = new Map(existing.map((page) => [page.url, page]));

  for (const page of incoming) {
    if (!byUrl.has(page.url)) {
      byUrl.set(page.url, page);
    }
  }

  return [...byUrl.values()];
}

function discoverSitemapCandidates(origin: string, robotsTxt: ResourceFetch): string[] {
  const candidates = new Set<string>([
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
    `${origin}/sitemap-index.xml`,
  ]);

  if (robotsTxt.content) {
    const sitemapMatches = robotsTxt.content.match(/^Sitemap:\s*(.+)$/gim) ?? [];
    for (const match of sitemapMatches) {
      const loc = match.replace(/^Sitemap:\s*/i, "").trim();
      if (loc) candidates.add(loc);
    }
  }

  return [...candidates];
}

async function resolveInitialSitemapUrl(
  candidates: string[],
  defaultSitemap: ResourceFetch,
  fetchXmlContent: (url: string) => Promise<string | null>,
): Promise<string | null> {
  const ordered = [
    ...(defaultSitemap.status === 200 && defaultSitemap.content?.trim()
      ? [defaultSitemap.url]
      : []),
    ...candidates.filter((url) => url !== defaultSitemap.url),
  ];

  for (const url of [...new Set(ordered)]) {
    const xml = await fetchXmlContent(url);
    if (xml?.trim()) {
      return url;
    }
  }

  return null;
}

/** Single-page homepage fetch for Phase 1 technology detection (no sitemap or link follow-up). */
export async function fetchShallowEntryPage(
  inputUrl: string,
  context?: CrawlRequestContext,
): Promise<PageData> {
  const initialUrl = normalizeInputUrl(inputUrl).href;
  return fetchPage(initialUrl, "pending", "pending", context);
}

export async function crawlSite(
  inputUrl: string,
  context?: CrawlRequestContext,
): Promise<CrawlData> {
  const initialUrl = normalizeInputUrl(inputUrl).href;
  const entryPage = await fetchPage(initialUrl, "pending", "pending", context);
  const entryUrl = entryPage.url;
  const origin = new URL(entryUrl).origin;

  const resourcePaths = {
    robotsTxt: `${origin}/robots.txt`,
    sitemapXml: `${origin}/sitemap.xml`,
    llmsTxt: `${origin}/llms.txt`,
    llmsFullTxt: `${origin}/llms-full.txt`,
  };

  const limit = pLimit(4);

  const [robotsTxt, sitemapXml, llmsTxt, llmsFullTxt] =
    await Promise.all([
      limit(() => fetchResource(resourcePaths.robotsTxt, context)),
      limit(() => fetchResource(resourcePaths.sitemapXml, context)),
      limit(() => fetchResource(resourcePaths.llmsTxt, context)),
      limit(() => fetchResource(resourcePaths.llmsFullTxt, context)),
    ]);

  let pages: PageData[] = [entryPage];

  const sitemapCandidates = discoverSitemapCandidates(origin, robotsTxt);
  const initialSitemap = await resolveInitialSitemapUrl(
    sitemapCandidates,
    sitemapXml,
    (url) => fetchXml(url, context),
  );

  let sitemapInfo = {
    sitemapUrls: [] as string[],
    urlsDiscovered: 0,
    urlsSelected: [] as string[],
    urlsCrawled: [] as string[],
  };

  if (initialSitemap) {
    // Must forward crawl cookies/context — password-gated Shopify stores expose
    // the index publicly but require the unlock session for nested product sitemaps.
    const resolved = await resolveSitemapUrls(initialSitemap, (url) =>
      fetchXml(url, context),
    );
    const sameOriginUrls = resolved.pageUrls.filter((url) =>
      isSameOrigin(url, origin),
    );
    const selected = prioritizeSitemapUrls(sameOriginUrls, SITEMAP_URL_LIMIT);

    sitemapInfo = {
      sitemapUrls: resolved.sitemapUrls,
      urlsDiscovered: sameOriginUrls.length,
      urlsSelected: selected,
      urlsCrawled: [],
    };

    if (selected.length > 0) {
      const sitemapPages = await Promise.all(
        selected.map((url) => limit(() => fetchPage(url, origin, entryUrl, context))),
      );
      sitemapInfo.urlsCrawled = sitemapPages
        .filter((page) => page.status === 200)
        .map((page) => page.url);
      pages = mergePages(pages, sitemapPages);
    }
  }

  const followUpUrls = selectFollowUpLinks(pages, entryUrl).filter(
    (url) => !pages.some((page) => page.url === url),
  );

  if (followUpUrls.length > 0) {
    const followUpPages = await Promise.all(
      followUpUrls.map((url) => limit(() => fetchPage(url, origin, entryUrl, context))),
    );
    pages = mergePages(pages, followUpPages);
  }

  const crawledUrls = new Set(pages.map((page) => page.url));
  const relatedLinks = selectRelatedDomainUrls(
    pages,
    crawledUrls,
    MAX_RELATED_DOMAIN_PAGES,
  );

  const relatedDomainInfo = {
    urlsSelected: relatedLinks.map((link) => link.href),
    urlsCrawled: [] as string[],
  };

  if (relatedLinks.length > 0) {
    const relatedPages = await Promise.all(
      relatedLinks.map((link) =>
        limit(() => fetchPage(link.href, origin, entryUrl, context)),
      ),
    );
    relatedDomainInfo.urlsCrawled = relatedPages
      .filter((page) => page.status === 200)
      .map((page) => page.url);
    pages = mergePages(pages, relatedPages);
  }

  const hosting = await resolveHostingProfile(new URL(entryUrl).hostname);

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
    hosting,
    sitemap: sitemapInfo,
    relatedDomain: relatedDomainInfo,
    crawledAt: new Date().toISOString(),
  };
}

export { extractSchemaTypes, parseJsonLdBlocks };
