import { linkHaystack } from "./link-extraction";
import type {
  ConfidenceLevel,
  CrawlData,
  DiscoveredLink,
  Finding,
  GroupedFindings,
  LinkMatch,
  PageData,
  PlatformAnalysis,
  ProductPriceDetection,
} from "./types";
import { detectPlatform } from "./platform";
import {
  buildFindingFromPages,
  findSchemaMatches,
  formatEvidenceList,
  getCrawlablePages,
  pageHasSchemaField,
  pageHasSchemaType,
  pagesMatchingContent,
  pagesMatchingUrlPatterns,
  pageSearchText,
  summarizePages,
  uniqueUrls,
} from "./schema-utils";

function detected(
  id: string,
  label: string,
  confidence: ConfidenceLevel,
  evidence: string,
  evidenceUrls: string[],
  sourceUrl: string,
  discoveredFromUrl: string | null = null,
): Finding {
  return {
    id,
    label,
    status: "detected",
    confidence,
    evidence,
    evidenceUrls: uniqueUrls(evidenceUrls),
    sourceUrl,
    discoveredFromUrl,
  };
}

function missing(id: string, label: string, sourceUrl: string): Finding {
  return {
    id,
    label,
    status: "missing",
    confidence: "low",
    evidence: "Not Detected",
    evidenceUrls: [sourceUrl],
    sourceUrl,
    discoveredFromUrl: null,
  };
}

function needsReview(
  id: string,
  label: string,
  confidence: ConfidenceLevel,
  evidence: string,
  evidenceUrls: string[],
  sourceUrl: string,
  discoveredFromUrl: string | null = null,
): Finding {
  return {
    id,
    label,
    status: "needs_review",
    confidence,
    evidence,
    evidenceUrls: uniqueUrls(evidenceUrls),
    sourceUrl,
    discoveredFromUrl,
  };
}

function collectAllLinks(pages: PageData[]): DiscoveredLink[] {
  const byHref = new Map<string, DiscoveredLink>();

  for (const page of pages) {
    for (const link of page.discoveredLinks) {
      if (!byHref.has(link.href)) {
        byHref.set(link.href, link);
      }
    }
  }

  return [...byHref.values()];
}

function findDiscoveredLinks(
  pages: PageData[],
  patterns: RegExp[],
): LinkMatch[] {
  const matches: LinkMatch[] = [];
  const seen = new Set<string>();

  for (const link of collectAllLinks(pages)) {
    if (!patterns.some((pattern) => pattern.test(linkHaystack(link)))) continue;
    if (seen.has(link.href)) continue;

    seen.add(link.href);
    matches.push({
      href: link.href,
      text: link.text || link.ariaLabel || link.titleAttr || "(no anchor text)",
      discoveredFromUrl: link.discoveredFromUrl,
      scope: link.scope,
      context: link.context,
    });
  }

  return matches;
}

function isStrongProductPageLink(link: LinkMatch): boolean {
  const text = `${link.text} ${link.context ?? ""}`.toLowerCase();
  const href = link.href.toLowerCase();

  return (
    /view product|add to cart|buy now|shop now|add to bag/.test(text) ||
    /\/products?\//i.test(href) ||
    /-p\d+/i.test(href)
  );
}

function formatLinkEvidence(matches: LinkMatch[]): string {
  return matches
    .slice(0, 3)
    .map(
      (match) =>
        `"${match.text}" → ${match.href} (discovered from ${match.discoveredFromUrl})`,
    )
    .join("; ");
}

function checkSchema(
  id: string,
  label: string,
  typeName: string,
  data: CrawlData,
): Finding {
  const match = findSchemaMatches(data.pages, typeName);

  if (match) {
    return detected(
      id,
      label,
      "high",
      `JSON-LD @type includes ${typeName}: ${match.types.join(", ")}`,
      [match.page.url],
      match.page.url,
      null,
    );
  }

  return missing(id, label, data.entryUrl);
}

function checkRobotsTxt(data: CrawlData): Finding {
  const { robotsTxt } = data.resources;

  if (robotsTxt.status === 200 && robotsTxt.content?.trim()) {
    const lines = robotsTxt.content
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 3);

    return detected(
      "robots-txt",
      "robots.txt",
      "high",
      `HTTP 200. Sample: ${lines.join(" | ")}`,
      [robotsTxt.url],
      robotsTxt.url,
    );
  }

  if (robotsTxt.status && robotsTxt.status !== 404) {
    return needsReview(
      "robots-txt",
      "robots.txt",
      "medium",
      `HTTP ${robotsTxt.status} at ${robotsTxt.url}`,
      [robotsTxt.url],
      robotsTxt.url,
    );
  }

  return missing("robots-txt", "robots.txt", robotsTxt.url);
}

function checkSitemap(data: CrawlData): Finding {
  const { sitemapXml } = data.resources;
  const resolvedSitemapUrl = data.sitemap.sitemapUrls[0] ?? null;

  if (sitemapXml.status === 200 && sitemapXml.content?.trim()) {
    const crawledCount = data.sitemap.urlsCrawled.length;
    const discoveredCount = data.sitemap.urlsDiscovered;
    const snippet = sitemapXml.content.replace(/\s+/g, " ").slice(0, 120);

    return detected(
      "sitemap-xml",
      "sitemap.xml",
      crawledCount > 0 ? "high" : "medium",
      `HTTP 200. Parsed ${discoveredCount} URL(s) from sitemap index/sets; crawled ${crawledCount}. Preview: ${snippet}${sitemapXml.content.length > 120 ? "…" : ""}`,
      uniqueUrls([sitemapXml.url, ...data.sitemap.urlsCrawled]),
      sitemapXml.url,
    );
  }

  if (data.sitemap.urlsDiscovered > 0 || data.sitemap.urlsCrawled.length > 0) {
    const crawledCount = data.sitemap.urlsCrawled.length;
    const discoveredCount = data.sitemap.urlsDiscovered;
    const sourceUrl = resolvedSitemapUrl ?? data.entryUrl;

    return detected(
      "sitemap-xml",
      "sitemap.xml",
      crawledCount > 0 ? "high" : "medium",
      resolvedSitemapUrl
        ? `Sitemap resolved at ${resolvedSitemapUrl}. Parsed ${discoveredCount} URL(s); crawled ${crawledCount}.`
        : `Sitemap discovered via robots.txt or nested index. Crawled ${crawledCount} prioritized URL(s).`,
      uniqueUrls(
        [sourceUrl, ...data.sitemap.sitemapUrls, ...data.sitemap.urlsCrawled].filter(
          Boolean,
        ),
      ),
      sourceUrl,
    );
  }

  if (sitemapXml.status && sitemapXml.status !== 404) {
    return needsReview(
      "sitemap-xml",
      "sitemap.xml",
      "medium",
      `HTTP ${sitemapXml.status} at ${sitemapXml.url}`,
      [sitemapXml.url],
      sitemapXml.url,
    );
  }

  return missing("sitemap-xml", "sitemap.xml", sitemapXml.url);
}

function checkLlmsTxt(data: CrawlData): Finding {
  const { llmsTxt, llmsFullTxt } = data.resources;

  if (llmsTxt.status === 200 && llmsTxt.content?.trim()) {
    const lines = llmsTxt.content
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 3);

    let evidence = `HTTP 200. Sample: ${lines.join(" | ")}`;
    const evidenceUrls = [llmsTxt.url];

    if (llmsFullTxt.status === 200 && llmsFullTxt.content?.trim()) {
      evidence += `; llms-full.txt also present`;
      evidenceUrls.push(llmsFullTxt.url);
    }

    return detected("llms-txt", "llms.txt", "high", evidence, evidenceUrls, llmsTxt.url);
  }

  if (llmsFullTxt.status === 200 && llmsFullTxt.content?.trim()) {
    return needsReview(
      "llms-txt",
      "llms.txt",
      "medium",
      `llms.txt not found, but llms-full.txt is present at ${llmsFullTxt.url}`,
      [llmsFullTxt.url],
      llmsFullTxt.url,
    );
  }

  if (llmsTxt.status && llmsTxt.status !== 404) {
    return needsReview(
      "llms-txt",
      "llms.txt",
      "medium",
      `HTTP ${llmsTxt.status} at ${llmsTxt.url}`,
      [llmsTxt.url],
      llmsTxt.url,
    );
  }

  return missing("llms-txt", "llms.txt", llmsTxt.url);
}

function checkPageDiscovery(
  id: string,
  label: string,
  data: CrawlData,
  urlPatterns: RegExp[],
  contentPatterns: RegExp[],
  linkPatterns: RegExp[],
  options?: {
    isStrongLink?: (link: LinkMatch) => boolean;
  },
): Finding {
  const crawlable = getCrawlablePages(data.pages);

  const urlMatches = pagesMatchingUrlPatterns(crawlable, urlPatterns);
  if (urlMatches.length > 0) {
    const built = buildFindingFromPages(urlMatches, "Matching URL pattern on crawled page");
    if (built) {
      return detected(
        id,
        label,
        "medium",
        built.evidence,
        built.evidenceUrls,
        built.sourceUrl,
      );
    }
  }

  const contentMatches = pagesMatchingContent(crawlable, contentPatterns).filter(
    (page) => !urlMatches.some((match) => match.url === page.url),
  );
  if (contentMatches.length > 0) {
    const built = buildFindingFromPages(
      contentMatches,
      "Matching title, meta, or visible content on crawled page",
    );
    if (built) {
      return detected(
        id,
        label,
        "medium",
        built.evidence,
        built.evidenceUrls,
        built.sourceUrl,
      );
    }
  }

  const links = findDiscoveredLinks(data.pages, linkPatterns);
  if (links.length > 0) {
    const best = links[0];
    const strongLinks = options?.isStrongLink
      ? links.filter((link) => options.isStrongLink!(link))
      : [];
    const hasStrongSameOriginLink = strongLinks.some((link) => link.scope === "same-origin");

    if (hasStrongSameOriginLink || best.scope === "related-domain") {
      const promoted = hasStrongSameOriginLink ? strongLinks[0] : best;
      const promotedLinks = hasStrongSameOriginLink ? strongLinks : links;

      return detected(
        id,
        label,
        "medium",
        hasStrongSameOriginLink
          ? `Product link discovered on merchant site: ${formatLinkEvidence(promotedLinks.slice(0, 3))}`
          : `Related domain link discovered on merchant site: ${formatLinkEvidence(promotedLinks.slice(0, 3))}`,
        uniqueUrls(promotedLinks.map((link) => link.href)),
        promoted.href,
        promoted.discoveredFromUrl,
      );
    }

    return needsReview(
      id,
      label,
      "low",
      `Keyword or URL pattern match in links only: ${formatLinkEvidence(links.slice(0, 3))}`,
      uniqueUrls(links.map((link) => link.href)),
      best.discoveredFromUrl,
      best.discoveredFromUrl,
    );
  }

  return missing(id, label, data.entryUrl);
}

function checkSupportSignal(
  id: string,
  label: string,
  data: CrawlData,
  urlPatterns: RegExp[],
  linkPatterns: RegExp[],
  contentPatterns: RegExp[] = [],
): Finding {
  const crawlable = getCrawlablePages(data.pages);
  const urlMatches = pagesMatchingUrlPatterns(crawlable, urlPatterns);

  if (urlMatches.length > 0) {
    const built = buildFindingFromPages(urlMatches, "Matching support URL on crawled page");
    if (built) {
      const isSupportDomain = urlMatches.some((page) =>
        /support\.|help\.|loopreturns|returns\./i.test(page.url),
      );
      return detected(
        id,
        label,
        isSupportDomain ? "high" : "medium",
        built.evidence,
        built.evidenceUrls,
        built.sourceUrl,
      );
    }
  }

  const contentMatches = pagesMatchingContent(crawlable, contentPatterns).filter(
    (page) => !urlMatches.some((match) => match.url === page.url),
  );
  if (contentMatches.length > 0) {
    const built = buildFindingFromPages(
      contentMatches,
      "Matching support content on crawled page",
    );
    if (built) {
      return detected(
        id,
        label,
        "medium",
        built.evidence,
        built.evidenceUrls,
        built.sourceUrl,
      );
    }
  }

  const links = findDiscoveredLinks(data.pages, linkPatterns);
  if (links.length > 0) {
    const relatedLinks = links.filter((link) => link.scope === "related-domain");
    const best = relatedLinks[0] ?? links[0];

    if (relatedLinks.length > 0) {
      return detected(
        id,
        label,
        "medium",
        `Related support domain linked from merchant site: ${formatLinkEvidence(relatedLinks.slice(0, 3))}`,
        uniqueUrls(relatedLinks.map((link) => link.href)),
        best.href,
        best.discoveredFromUrl,
      );
    }

    return needsReview(
      id,
      label,
      "low",
      `Support link discovered on merchant site: ${formatLinkEvidence(links.slice(0, 3))}`,
      uniqueUrls(links.map((link) => link.href)),
      best.href,
      best.discoveredFromUrl,
    );
  }

  return missing(id, label, data.entryUrl);
}

function checkProductPages(data: CrawlData, platform: PlatformAnalysis): Finding {
  const shopifyPatterns =
    platform.platform === "Shopify" ? [/\/products\/[^/?#]+/i] : [];
  const bigCommercePatterns =
    platform.platform === "BigCommerce" ? [/-p\d+/i] : [];

  return checkPageDiscovery(
    "product-pages",
    "Product pages",
    data,
    [
      ...shopifyPatterns,
      ...bigCommercePatterns,
      /\/products?\//i,
      /\/product\//i,
      /\/p\/[^/?#]+/i,
      /\/catalog\/product\//i,
      /\/shop\/[^/?#]+/i,
    ],
    [/product detail/i, /\bproduct\b/i],
    [/product/i, /\/products?\//i, /-p\d+/i],
    { isStrongLink: isStrongProductPageLink },
  );
}

function checkCollectionPages(data: CrawlData, platform: PlatformAnalysis): Finding {
  const shopifyPatterns =
    platform.platform === "Shopify" ? [/\/collections\/[^/?#]+/i] : [];

  return checkPageDiscovery(
    "collection-pages",
    "Collection pages",
    data,
    [...shopifyPatterns, /\/collections?\//i, /\/collection\//i],
    [/collection/i, /shop all/i],
    [/collection/i, /\/collections?\//i],
  );
}

function checkCategoryPages(data: CrawlData, platform: PlatformAnalysis): Finding {
  const bigCommercePatterns =
    platform.platform === "BigCommerce" ? [/\/categories?\//i] : [];

  return checkPageDiscovery(
    "category-pages",
    "Category pages",
    data,
    [
      ...bigCommercePatterns,
      /\/category\//i,
      /\/categories\//i,
      /\/catalog\/category\//i,
    ],
    [/category/i, /browse by/i],
    [/category/i, /\/categories?\//i],
  );
}

function checkCatalogPages(data: CrawlData, platform: PlatformAnalysis): Finding {
  const magentoPatterns =
    platform.platform === "Magento" ? [/\/catalog\/(category|product)\//i] : [];

  return checkPageDiscovery(
    "catalog-pages",
    "Catalog pages",
    data,
    [
      ...magentoPatterns,
      /\/catalog\b/i,
      /\/catalog\//i,
      /\/shop\b/i,
      /\/store\b/i,
    ],
    [/catalog/i, /all products/i],
    [/catalog/i, /\/catalog\b/i],
  );
}

function detectProductPrices(data: CrawlData): ProductPriceDetection {
  const crawlable = getCrawlablePages(data.pages);
  const pagesWithOfferSchema: PageData[] = [];
  const pagesWithShopifyJson: PageData[] = [];
  const pagesWithPriceMeta: PageData[] = [];

  for (const page of crawlable) {
    if (
      pageHasSchemaType(page, "Product") ||
      pageHasSchemaType(page, "Offer") ||
      pageHasSchemaField(page, ["price", "lowPrice", "highPrice"]).length > 0
    ) {
      pagesWithOfferSchema.push(page);
    }

    if (
      page.htmlSnippet &&
      (/\/products\/[^"']+\.js/i.test(page.htmlSnippet) ||
        pageHasSchemaField(page, ["price", "lowPrice", "highPrice"]).length > 0)
    ) {
      pagesWithShopifyJson.push(page);
    }
  }

  if (pagesWithOfferSchema.length > 0) {
    const prices = pagesWithOfferSchema.flatMap((page) =>
      pageHasSchemaField(page, ["price", "lowPrice", "highPrice"]),
    );
    const finding = detected(
      "product-prices",
      "Product prices",
      "high",
      `Product/Offer JSON-LD price fields: ${formatEvidenceList(prices)} on ${summarizePages(pagesWithOfferSchema, 2)}`,
      pagesWithOfferSchema.map((page) => page.url),
      pagesWithOfferSchema[0].url,
    );
    return {
      finding,
      evidenceUrls: finding.evidenceUrls,
      sourceUrl: finding.sourceUrl,
    };
  }

  if (pagesWithShopifyJson.length > 0) {
    const finding = detected(
      "product-prices",
      "Product prices",
      "high",
      `Shopify product JSON or Offer schema detected on ${summarizePages(pagesWithShopifyJson, 2)}`,
      pagesWithShopifyJson.map((page) => page.url),
      pagesWithShopifyJson[0].url,
    );
    return {
      finding,
      evidenceUrls: finding.evidenceUrls,
      sourceUrl: finding.sourceUrl,
    };
  }

  for (const page of crawlable) {
    const haystack = pageSearchText(page);
    if (
      /\/products?\//i.test(page.url) &&
      /\$[\d,.]+|\bUSD\b|\bEUR\b|\bGBP\b|£[\d,.]+|€[\d,.]+/.test(haystack)
    ) {
      pagesWithPriceMeta.push(page);
    }
  }

  if (pagesWithPriceMeta.length === 0) {
    for (const page of crawlable) {
      const pricedProductLinks = page.discoveredLinks.filter(
        (link) =>
          link.scope === "same-origin" &&
          isStrongProductPageLink({
            href: link.href,
            text: link.text,
            discoveredFromUrl: link.discoveredFromUrl,
            scope: link.scope,
            context: link.context,
          }) &&
          /\$[\d,.]+|\bUSD\b|\bEUR\b|\bGBP\b|£[\d,.]+|€[\d,.]+/.test(link.text),
      );

      if (pricedProductLinks.length > 0) {
        pagesWithPriceMeta.push(page);
      }
    }
  }

  if (pagesWithPriceMeta.length > 0) {
    const built = buildFindingFromPages(
      pagesWithPriceMeta,
      "Currency or price pattern on product page",
    );
    if (built) {
      const finding = detected(
        "product-prices",
        "Product prices",
        "medium",
        built.evidence,
        built.evidenceUrls,
        built.sourceUrl,
      );
      return {
        finding,
        evidenceUrls: finding.evidenceUrls,
        sourceUrl: finding.sourceUrl,
      };
    }
  }

  return { finding: null, evidenceUrls: [], sourceUrl: null };
}

function checkPricingInformation(
  data: CrawlData,
  productPrices: ProductPriceDetection,
): Finding {
  if (productPrices.finding?.status === "detected") {
    return detected(
      "pricing-information",
      "Pricing information",
      productPrices.finding.confidence,
      `Pricing information inferred from detected product prices: ${productPrices.finding.evidence}`,
      productPrices.evidenceUrls,
      productPrices.sourceUrl ?? data.entryUrl,
    );
  }

  const crawlable = getCrawlablePages(data.pages);
  const pricingPages = pagesMatchingUrlPatterns(crawlable, [
    /pricing/i,
    /\/price(s)?\b/i,
    /\/plans?\b/i,
  ]);

  if (pricingPages.length > 0) {
    const built = buildFindingFromPages(pricingPages, "Pricing page URL discovered");
    if (built) {
      return detected(
        "pricing-information",
        "Pricing information",
        "medium",
        built.evidence,
        built.evidenceUrls,
        built.sourceUrl,
      );
    }
  }

  const contentPages = pagesMatchingContent(crawlable, [
    /pricing/i,
    /subscription plan/i,
  ]).filter((page) => !pricingPages.some((match) => match.url === page.url));

  if (contentPages.length > 0) {
    const built = buildFindingFromPages(
      contentPages,
      "Pricing-related content on crawled page",
    );
    if (built) {
      return detected(
        "pricing-information",
        "Pricing information",
        "low",
        built.evidence,
        built.evidenceUrls,
        built.sourceUrl,
      );
    }
  }

  const links = findDiscoveredLinks(data.pages, [
    /pricing/i,
    /\/price(s)?\b/i,
    /\/plans?\b/i,
  ]);
  if (links.length > 0) {
    return needsReview(
      "pricing-information",
      "Pricing information",
      "low",
      `Keyword match only in links: ${formatLinkEvidence(links.slice(0, 3))}`,
      uniqueUrls(links.map((link) => link.href)),
      links[0].href,
      links[0].discoveredFromUrl,
    );
  }

  return missing("pricing-information", "Pricing information", data.entryUrl);
}

function checkProductAvailability(data: CrawlData): Finding {
  const crawlable = getCrawlablePages(data.pages);

  for (const page of crawlable) {
    const availability = pageHasSchemaField(page, ["availability"]);
    if (availability.length > 0) {
      return detected(
        "product-availability",
        "Product availability",
        "high",
        `JSON-LD availability: ${formatEvidenceList(availability)}`,
        [page.url],
        page.url,
      );
    }
  }

  const contentPages = pagesMatchingContent(crawlable, [
    /in stock/i,
    /out of stock/i,
    /sold out/i,
    /available now/i,
  ]);

  if (contentPages.length > 0) {
    const built = buildFindingFromPages(
      contentPages,
      "Availability language in page content",
    );
    if (built) {
      return detected(
        "product-availability",
        "Product availability",
        "medium",
        built.evidence,
        built.evidenceUrls,
        built.sourceUrl,
      );
    }
  }

  return missing("product-availability", "Product availability", data.entryUrl);
}

function checkCartCheckout(data: CrawlData, platform: PlatformAnalysis): Finding {
  const platformPatterns: RegExp[] = [];

  if (platform.platform === "Shopify") {
    platformPatterns.push(/\/cart\b/i, /\/checkout\b/i, /\/cart\.js/i);
  }

  const cartPages = pagesMatchingUrlPatterns(getCrawlablePages(data.pages), [
    ...platformPatterns,
    /\/cart\b/i,
    /\/checkout\b/i,
    /\/bag\b/i,
    /add-to-cart/i,
  ]);

  if (cartPages.length > 0) {
    const built = buildFindingFromPages(cartPages, "Cart or checkout URL on crawled page");
    if (built) {
      return detected(
        "cart-checkout-pages",
        "Cart or checkout pages",
        "medium",
        built.evidence,
        built.evidenceUrls,
        built.sourceUrl,
      );
    }
  }

  const links = findDiscoveredLinks(data.pages, [
    /checkout/i,
    /\/cart\b/i,
    /\bcart\b/i,
    /\/bag\b/i,
    /add-to-cart/i,
  ]);

  if (links.length > 0) {
    const crawledMatch = links.find((match) =>
      data.pages.some(
        (page) => page.url === match.href && page.status === 200 && page.title,
      ),
    );

    if (crawledMatch) {
      const page = data.pages.find((entry) => entry.url === crawledMatch.href)!;
      return detected(
        "cart-checkout-pages",
        "Cart or checkout pages",
        "medium",
        `Link found and page crawled. Title: "${page.title}". ${formatLinkEvidence([crawledMatch])}`,
        [crawledMatch.href],
        crawledMatch.href,
        crawledMatch.discoveredFromUrl,
      );
    }

    const best = links[0];
    return detected(
      "cart-checkout-pages",
      "Cart or checkout pages",
      best.scope === "same-origin" ? "medium" : "low",
      `Cart or checkout link discovered on merchant site: ${formatLinkEvidence(links.slice(0, 3))}`,
      uniqueUrls(links.map((link) => link.href)),
      best.href,
      best.discoveredFromUrl,
    );
  }

  return missing("cart-checkout-pages", "Cart or checkout pages", data.entryUrl);
}

function checkApiDeveloperDocs(data: CrawlData): Finding {
  const pages = pagesMatchingUrlPatterns(getCrawlablePages(data.pages), [
    /\/api\b/i,
    /developer/i,
    /\/docs?\b/i,
    /documentation/i,
  ]);

  if (pages.length > 0) {
    const built = buildFindingFromPages(pages, "API or developer docs URL on crawled page");
    if (built) {
      return detected(
        "api-developer-docs",
        "API or developer docs links",
        "medium",
        built.evidence,
        built.evidenceUrls,
        built.sourceUrl,
      );
    }
  }

  const links = findDiscoveredLinks(data.pages, [
    /\/api\b/i,
    /developer/i,
    /\/docs?\b/i,
    /documentation/i,
  ]);

  if (links.length > 0) {
    return needsReview(
      "api-developer-docs",
      "API or developer docs links",
      "low",
      `Keyword match only in links: ${formatLinkEvidence(links.slice(0, 3))}`,
      uniqueUrls(links.map((link) => link.href)),
      links[0].href,
      links[0].discoveredFromUrl,
    );
  }

  return missing("api-developer-docs", "API or developer docs links", data.entryUrl);
}

function checkSearchAction(data: CrawlData): Finding {
  const crawlable = getCrawlablePages(data.pages);

  for (const page of crawlable) {
    const hasSearchAction = page.jsonLdBlocks.some((block) => {
      const serialized = JSON.stringify(block).toLowerCase();
      return serialized.includes("searchaction");
    });

    if (hasSearchAction || pageHasSchemaType(page, "SearchAction")) {
      return detected(
        "search-action-schema",
        "SearchAction schema",
        "high",
        "JSON-LD SearchAction detected",
        [page.url],
        page.url,
      );
    }
  }

  return missing("search-action-schema", "SearchAction schema", data.entryUrl);
}

function reconcileRelatedFindings(
  findings: Finding[],
  platform: PlatformAnalysis,
): Finding[] {
  const byId = new Map(findings.map((finding) => [finding.id, finding]));

  function rank(finding: Finding): number {
    if (finding.status === "detected") return 3;
    if (finding.status === "needs_review") return 2;
    return 1;
  }

  function get(id: string): Finding | undefined {
    return byId.get(id);
  }

  function isDetected(id: string): boolean {
    return get(id)?.status === "detected";
  }

  function syncGroup(ids: string[], labels: Record<string, string>) {
    const group = ids
      .map((id) => byId.get(id))
      .filter((finding): finding is Finding => Boolean(finding));

    if (group.length === 0) return;

    const best = group.reduce((current, candidate) =>
      rank(candidate) > rank(current) ? candidate : current,
    );

    if (rank(best) === 1) return;

    for (const id of ids) {
      byId.set(id, {
        ...best,
        id,
        label: labels[id] ?? best.label,
      });
    }
  }

  syncGroup(["cart-checkout-pages", "checkout-cart-links"], {
    "cart-checkout-pages": "Cart or checkout pages",
    "checkout-cart-links": "Checkout or cart links",
  });

  syncGroup(["returns-page", "return-policy-page"], {
    "returns-page": "Returns page",
    "return-policy-page": "Return policy page",
  });

  syncGroup(["pricing-information", "product-prices", "pricing-page"], {
    "pricing-information": "Pricing information",
    "product-prices": "Product prices",
    "pricing-page": "Pricing page",
  });

  const faqSchema = get("faq-schema");
  const faqPageEvidence = ["faq-page", "help-center"]
    .map((id) => get(id))
    .find((finding) => finding?.status === "detected");

  if (faqSchema?.status === "missing" && faqPageEvidence) {
    byId.set(
      "faq-schema",
      needsReview(
        "faq-schema",
        "FAQ schema",
        "medium",
        `FAQ or help content was discovered (${faqPageEvidence.label.toLowerCase()}), but FAQPage JSON-LD was not found on crawled pages`,
        faqPageEvidence.evidenceUrls,
        faqPageEvidence.sourceUrl,
        faqPageEvidence.discoveredFromUrl,
      ),
    );
  }

  const itemListSchema = get("item-list-schema");
  const collectionPages = get("collection-pages");
  const catalogPages = get("catalog-pages");

  if (
    itemListSchema?.status === "missing" &&
    (isDetected("collection-pages") || isDetected("catalog-pages"))
  ) {
    const pageEvidence = collectionPages?.status === "detected" ? collectionPages : catalogPages!;
    byId.set(
      "item-list-schema",
      needsReview(
        "item-list-schema",
        "ItemList schema",
        "medium",
        `Collection or catalog pages were discovered, but ItemList JSON-LD was not found on crawled pages`,
        pageEvidence.evidenceUrls,
        pageEvidence.sourceUrl,
        pageEvidence.discoveredFromUrl,
      ),
    );
  }

  const apiDocs = get("api-developer-docs");
  const storefrontPlatforms: PlatformAnalysis["platform"][] = [
    "Shopify",
    "BigCommerce",
    "WooCommerce",
    "Wix",
    "Squarespace",
    "Magento",
  ];

  if (
    apiDocs?.status === "missing" &&
    storefrontPlatforms.includes(platform.platform)
  ) {
    byId.set(
      "api-developer-docs",
      needsReview(
        "api-developer-docs",
        "API or developer docs links",
        "low",
        `No merchant API or developer documentation links found on this ${platform.platform} storefront. Platform commerce APIs are separate from on-site merchant discoverability`,
        [platform.sourceUrls[0] ?? apiDocs.sourceUrl],
        apiDocs.sourceUrl,
      ),
    );
  }

  return findings.map((finding) => byId.get(finding.id) ?? finding);
}

export function finalizeFindings(
  findings: Finding[],
  platform: PlatformAnalysis,
): Finding[] {
  return reconcileRelatedFindings(findings, platform);
}

export function runChecks(data: CrawlData): {
  platform: PlatformAnalysis;
  findings: Finding[];
} {
  const platform = detectPlatform(data);
  const productPrices = detectProductPrices(data);
  const productPricesFinding =
    productPrices.finding ?? missing("product-prices", "Product prices", data.entryUrl);

  const findings = finalizeFindings([
    checkRobotsTxt(data),
    checkSitemap(data),
    checkLlmsTxt(data),
    checkSchema("product-schema", "Product schema", "Product", data),
    checkSchema("offer-schema", "Offer schema", "Offer", data),
    checkSchema("organization-schema", "Organization schema", "Organization", data),
    checkSchema("faq-schema", "FAQ schema", "FAQPage", data),
    checkSchema("breadcrumb-schema", "BreadcrumbList schema", "BreadcrumbList", data),
    checkSchema("website-schema", "WebSite schema", "WebSite", data),
    checkSearchAction(data),
    checkSchema("item-list-schema", "ItemList schema", "ItemList", data),
    checkProductPages(data, platform),
    checkCollectionPages(data, platform),
    checkCategoryPages(data, platform),
    checkCatalogPages(data, platform),
    checkPricingInformation(data, productPrices),
    productPricesFinding,
    checkProductAvailability(data),
    checkSupportSignal(
      "help-center",
      "Help center",
      data,
      [/support\.|help\./i, /help.?center/i, /\/help\b/i],
      [/help.?center/i, /\bhelp\b/i, /support\./i],
      [/help center/i, /customer support/i],
    ),
    checkSupportSignal(
      "faq-page",
      "FAQ page",
      data,
      [/faq/i, /\/faq\b/i, /support\./i],
      [/faq/i, /frequently asked questions/i, /support\./i],
      [/frequently asked questions/i, /\bfaq\b/i],
    ),
    checkSupportSignal(
      "shipping-page",
      "Shipping page",
      data,
      [/shipping/i, /delivery/i, /delivery-information/i, /ship(ping)?-policy/i],
      [/shipping/i, /delivery/i, /delivery information/i],
      [/shipping/i, /delivery/i, /delivery information/i],
    ),
    checkSupportSignal(
      "delivery-information",
      "Delivery information",
      data,
      [/delivery-information/i, /delivery/i, /shipping/i],
      [/delivery information/i, /shipping policy/i],
      [/delivery information/i, /delivery/i],
    ),
    checkSupportSignal(
      "returns-page",
      "Returns page",
      data,
      [/returns?-policy/i, /\/returns?\b/i, /returns?\//i],
      [/return policy/i, /returns & exchanges/i],
      [/return/i, /returns policy/i],
    ),
    checkSupportSignal(
      "return-policy-page",
      "Return policy page",
      data,
      [/returns?-policy/i, /return-policy/i, /\/returns?\b/i],
      [/return policy/i, /returns policy/i],
      [/return policy/i, /returns policy/i],
    ),
    checkSupportSignal(
      "refund-page",
      "Refund page",
      data,
      [/refund/i, /\/refund/i],
      [/refund/i, /refund policy/i],
      [/refund/i],
    ),
    checkSupportSignal(
      "return-portal",
      "Return portal",
      data,
      [/loopreturns/i, /return-portal/i, /make-a-return/i, /returns?\./i],
      [/loopreturns/i, /make a return/i, /start a return/i],
      [/make a return/i, /loopreturns/i, /return portal/i],
    ),
    checkSupportSignal(
      "contact-page",
      "Contact page",
      data,
      [/contact/i, /\/contact\b/i, /support\./i],
      [/contact us/i, /customer support/i, /contact support/i],
      [/contact/i, /support/i, /contact support/i],
    ),
    checkSupportSignal(
      "contact-support",
      "Contact support",
      data,
      [/contact/i, /support\./i, /help\./i],
      [/contact support/i, /customer support/i],
      [/contact support/i, /support/i],
    ),
    checkCartCheckout(data, platform),
    checkApiDeveloperDocs(data),
    checkPageDiscovery(
      "pricing-page",
      "Pricing page",
      data,
      [/pricing/i, /\/price(s)?\b/i, /\/plans?\b/i],
      [/pricing/i, /plans & pricing/i],
      [/pricing/i, /\/price(s)?\b/i],
    ),
    checkPageDiscovery(
      "checkout-cart-links",
      "Checkout or cart links",
      data,
      [/checkout/i, /\/cart\b/i, /\/bag\b/i],
      [/checkout/i, /\bcart\b/i],
      [/checkout/i, /\/cart\b/i, /\bcart\b/i],
    ),
  ], platform);

  return { platform, findings };
}

export function groupFindings(findings: Finding[]): GroupedFindings {
  return {
    detected: findings.filter((finding) => finding.status === "detected"),
    missing: findings.filter((finding) => finding.status === "missing"),
    needsReview: findings.filter((finding) => finding.status === "needs_review"),
  };
}
