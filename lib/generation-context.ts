import {
  getCrawlablePages,
  pagesMatchingUrlPatterns,
  uniqueUrls,
} from "./schema-utils";
import type {
  CrawlData,
  Finding,
  GenerationContext,
  PlatformAnalysis,
} from "./types";
import { isFaqUrl, isPolicyOrLegalUrl } from "./page-classification";

const SUPPORT_LINK_PATTERNS = [
  /help/i,
  /support/i,
  /faq/i,
  /contact/i,
  /shipping/i,
  /returns?/i,
  /privacy/i,
  /terms/i,
  /policy/i,
];

const PRODUCT_URL_PATTERNS = [
  /\/products?\//i,
  /\/product\//i,
  /\/p\/[^/?#]+/i,
  /\/catalog\/product\//i,
  /\/shop\/[^/?#]+/i,
];

function collectSupportLinks(pages: CrawlData["pages"]) {
  const links: GenerationContext["supportLinks"] = [];
  const seen = new Set<string>();

  for (const page of pages) {
    for (const link of page.discoveredLinks) {
      const haystack = `${link.text} ${link.href} ${link.ariaLabel ?? ""} ${link.titleAttr ?? ""}`;
      if (!SUPPORT_LINK_PATTERNS.some((pattern) => pattern.test(haystack))) {
        continue;
      }

      if (seen.has(link.href)) continue;
      seen.add(link.href);

      links.push({
        href: link.href,
        text: link.text || link.ariaLabel || link.titleAttr || link.href,
        discoveredFromUrl: link.discoveredFromUrl,
      });
    }
  }

  return links;
}

function collectProductPageUrls(
  pages: CrawlData["pages"],
  platform: PlatformAnalysis,
  productPagesFinding: Finding | undefined,
): string[] {
  const shopifyPatterns =
    platform.platform === "Shopify" ? [/\/products\/[^/?#]+/i] : [];

  const fromPatterns = pagesMatchingUrlPatterns(pages, [
    ...shopifyPatterns,
    ...PRODUCT_URL_PATTERNS,
  ]).map((page) => page.url);

  const fromFinding = productPagesFinding?.evidenceUrls ?? [];

  return uniqueUrls([...fromPatterns, ...fromFinding]).slice(0, 10);
}

function snapshotResource(resource: CrawlData["resources"]["robotsTxt"]) {
  return {
    url: resource.url,
    status: resource.status,
    content: resource.content,
  };
}

export function buildGenerationContext(
  crawlData: CrawlData,
  platform: PlatformAnalysis,
  findings: Finding[],
): GenerationContext {
  const crawlable = getCrawlablePages(crawlData.pages);
  const productPagesFinding = findings.find((finding) => finding.id === "product-pages");

  return {
    auditedUrl: crawlData.entryUrl,
    origin: crawlData.origin,
    crawledAt: crawlData.crawledAt,
    platform,
    findings,
    pages: crawlable.map((page) => ({
      url: page.url,
      title: page.title,
      metaDescription: page.metaDescription,
      schemaTypes: page.schemaTypes,
      jsonLdBlocks: page.jsonLdBlocks,
    })),
    robotsTxt: snapshotResource(crawlData.resources.robotsTxt),
    sitemapXml: snapshotResource(crawlData.resources.sitemapXml),
    llmsTxt: snapshotResource(crawlData.resources.llmsTxt),
    llmsFullTxt: snapshotResource(crawlData.resources.llmsFullTxt),
    sitemapUrls: crawlData.sitemap.urlsSelected,
    supportLinks: collectSupportLinks(crawlData.pages),
    productPageUrls: collectProductPageUrls(crawlable, platform, productPagesFinding),
    homepage: (() => {
      const page =
        crawlable.find((entry) => {
          try {
            return (
              new URL(entry.url).pathname === "/" || entry.url === crawlData.entryUrl
            );
          } catch {
            return false;
          }
        }) ?? crawlable[0];

      if (!page) return null;

      return {
        url: page.url,
        title: page.title,
        metaDescription: page.metaDescription,
        schemaTypes: page.schemaTypes,
        jsonLdBlocks: page.jsonLdBlocks,
      };
    })(),
    faqPages: crawlable
      .filter((page) => {
        if (isPolicyOrLegalUrl(page.url)) return false;
        if (isFaqUrl(page.url)) return true;
        const title = page.title?.toLowerCase() ?? "";
        return /\bfaq\b|frequently asked/.test(title);
      })
      .slice(0, 5)
      .map((page) => ({
        url: page.url,
        title: page.title,
        metaDescription: page.metaDescription,
        schemaTypes: page.schemaTypes,
        jsonLdBlocks: page.jsonLdBlocks,
      })),
  };
}

export function buildGenerationContextFromFindings(
  auditUrl: string,
  crawledAt: string,
  platform: PlatformAnalysis,
  findings: Finding[],
): GenerationContext {
  let origin = auditUrl;

  try {
    origin = new URL(auditUrl).origin;
  } catch {
    // keep auditUrl as fallback
  }

  const productPagesFinding = findings.find((finding) => finding.id === "product-pages");

  return {
    auditedUrl: auditUrl,
    origin,
    crawledAt,
    platform,
    findings,
    pages: [],
    robotsTxt: { url: `${origin}/robots.txt`, status: null, content: null },
    sitemapXml: { url: `${origin}/sitemap.xml`, status: null, content: null },
    llmsTxt: { url: `${origin}/llms.txt`, status: null, content: null },
    llmsFullTxt: { url: `${origin}/llms-full.txt`, status: null, content: null },
    sitemapUrls: [],
    supportLinks: [],
    productPageUrls: productPagesFinding?.evidenceUrls.slice(0, 10) ?? [],
    homepage: null,
    faqPages: [],
  };
}
