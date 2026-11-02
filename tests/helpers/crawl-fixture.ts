import type { CrawlData, PageData } from "@/lib/types";

export function makePage(partial: Partial<PageData> & { url: string }): PageData {
  return {
    title: partial.title ?? null,
    metaDescription: partial.metaDescription ?? null,
    bodyTextSnippet: partial.bodyTextSnippet ?? null,
    htmlSnippet: partial.htmlSnippet ?? null,
    jsonLdBlocks: partial.jsonLdBlocks ?? [],
    schemaTypes: partial.schemaTypes ?? [],
    discoveredLinks: partial.discoveredLinks ?? [],
    internalLinks: partial.internalLinks ?? [],
    status: partial.status ?? 200,
    error: partial.error,
    passwordGated: partial.passwordGated,
    verificationLimitation: partial.verificationLimitation,
    url: partial.url,
  };
}

export function makeCrawlData(input: {
  entryUrl?: string;
  pages: PageData[];
  collectionUrlsDiscovered?: string[];
  urlsSkippedByBudget?: string[];
  urlsDiscovered?: number;
  urlsSelected?: string[];
}): CrawlData {
  const entryUrl = input.entryUrl ?? "https://example.com/";
  const origin = new URL(entryUrl).origin;

  return {
    entryUrl,
    origin,
    pages: input.pages,
    resources: {
      robotsTxt: { url: `${origin}/robots.txt`, status: 200, content: "User-agent: *\nAllow: /", contentType: "text/plain" },
      sitemapXml: { url: `${origin}/sitemap.xml`, status: 200, content: "<urlset></urlset>", contentType: "application/xml" },
      llmsTxt: { url: `${origin}/llms.txt`, status: 404, content: null, contentType: null },
      llmsFullTxt: { url: `${origin}/llms-full.txt`, status: 404, content: null, contentType: null },
    },
    sitemap: {
      sitemapUrls: [`${origin}/sitemap.xml`],
      urlsDiscovered: input.urlsDiscovered ?? input.pages.length,
      urlsSelected: input.urlsSelected ?? input.pages.map((page) => page.url),
      urlsCrawled: input.pages.filter((page) => page.status === 200).map((page) => page.url),
      urlsSkippedByBudget: input.urlsSkippedByBudget ?? [],
      collectionUrlsDiscovered: input.collectionUrlsDiscovered ?? [],
    },
    relatedDomain: { urlsSelected: [], urlsCrawled: [] },
    crawledAt: "2026-11-02T00:00:00.000Z",
  };
}
