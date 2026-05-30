import type {
  ConfidenceLevel,
  CrawlData,
  Finding,
  GroupedFindings,
  PageData,
  PlatformAnalysis,
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

interface LinkMatch {
  href: string;
  text: string;
  sourceUrl: string;
}

function detected(
  id: string,
  label: string,
  confidence: ConfidenceLevel,
  evidence: string,
  evidenceUrls: string[],
  sourceUrl: string,
): Finding {
  return {
    id,
    label,
    status: "detected",
    confidence,
    evidence,
    evidenceUrls: uniqueUrls(evidenceUrls),
    sourceUrl,
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
  };
}

function needsReview(
  id: string,
  label: string,
  confidence: ConfidenceLevel,
  evidence: string,
  evidenceUrls: string[],
  sourceUrl: string,
): Finding {
  return {
    id,
    label,
    status: "needs_review",
    confidence,
    evidence,
    evidenceUrls: uniqueUrls(evidenceUrls),
    sourceUrl,
  };
}

function findLinks(pages: PageData[], patterns: RegExp[]): LinkMatch[] {
  const matches: LinkMatch[] = [];
  const seen = new Set<string>();

  for (const page of pages) {
    for (const link of page.internalLinks) {
      const haystack = `${link.href} ${link.text}`.toLowerCase();
      if (!patterns.some((pattern) => pattern.test(haystack))) continue;
      if (seen.has(link.href)) continue;

      seen.add(link.href);
      matches.push({
        href: link.href,
        text: link.text || "(no anchor text)",
        sourceUrl: page.url,
      });
    }
  }

  return matches;
}

function formatLinkEvidence(matches: LinkMatch[]): string {
  return matches
    .slice(0, 3)
    .map((match) => `"${match.text}" → ${match.href}`)
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

  if (data.sitemap.urlsCrawled.length > 0) {
    return detected(
      "sitemap-xml",
      "sitemap.xml",
      "medium",
      `Sitemap discovered via robots.txt or nested index. Crawled ${data.sitemap.urlsCrawled.length} prioritized URL(s).`,
      uniqueUrls(data.sitemap.sitemapUrls.concat(data.sitemap.urlsCrawled)),
      data.sitemap.sitemapUrls[0] ?? data.entryUrl,
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
): Finding {
  const crawlable = getCrawlablePages(data.pages);

  const urlMatches = pagesMatchingUrlPatterns(crawlable, urlPatterns);
  if (urlMatches.length > 0) {
    const built = buildFindingFromPages(urlMatches, "Matching URL pattern on crawled page");
    if (built) {
      return detected(id, label, "medium", built.evidence, built.evidenceUrls, built.sourceUrl);
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
      return detected(id, label, "medium", built.evidence, built.evidenceUrls, built.sourceUrl);
    }
  }

  const links = findLinks(data.pages, linkPatterns);
  if (links.length > 0) {
    return needsReview(
      id,
      label,
      "low",
      `Keyword or URL pattern match in internal links only: ${formatLinkEvidence(links)}`,
      uniqueUrls(links.map((link) => link.href)),
      links[0].sourceUrl,
    );
  }

  return missing(id, label, data.entryUrl);
}

function checkProductPages(data: CrawlData, platform: PlatformAnalysis): Finding {
  const shopifyPatterns =
    platform.platform === "Shopify"
      ? [/\/products\/[^/?#]+/i]
      : [];

  return checkPageDiscovery(
    "product-pages",
    "Product pages",
    data,
    [
      ...shopifyPatterns,
      /\/products?\//i,
      /\/product\//i,
      /\/p\/[^/?#]+/i,
      /\/catalog\/product\//i,
      /\/shop\/[^/?#]+/i,
    ],
    [/product detail/i, /\bproduct\b/i],
    [/product/i, /\/products?\//i],
  );
}

function checkCollectionPages(data: CrawlData, platform: PlatformAnalysis): Finding {
  const shopifyPatterns =
    platform.platform === "Shopify" ? [/\/collections\/[^/?#]+/i] : [];

  return checkPageDiscovery(
    "collection-pages",
    "Collection pages",
    data,
    [
      ...shopifyPatterns,
      /\/collections?\//i,
      /\/collection\//i,
    ],
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

function checkPricingInformation(data: CrawlData): Finding {
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

  const contentPages = pagesMatchingContent(crawlable, [/pricing/i, /subscription plan/i]).filter(
    (page) => !pricingPages.some((match) => match.url === page.url),
  );

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

  const links = findLinks(data.pages, [/pricing/i, /\/price(s)?\b/i, /\/plans?\b/i]);
  if (links.length > 0) {
    return needsReview(
      "pricing-information",
      "Pricing information",
      "low",
      `Keyword match only in internal links: ${formatLinkEvidence(links)}`,
      uniqueUrls(links.map((link) => link.href)),
      links[0].sourceUrl,
    );
  }

  return missing("pricing-information", "Pricing information", data.entryUrl);
}

function checkProductPrices(data: CrawlData): Finding {
  const crawlable = getCrawlablePages(data.pages);
  const pagesWithOfferSchema: PageData[] = [];
  const pagesWithPriceMeta: PageData[] = [];

  for (const page of crawlable) {
    if (pageHasSchemaType(page, "Offer") || pageHasSchemaField(page, ["price", "lowPrice", "highPrice"]).length > 0) {
      pagesWithOfferSchema.push(page);
    }
  }

  if (pagesWithOfferSchema.length > 0) {
    const prices = pagesWithOfferSchema.flatMap((page) =>
      pageHasSchemaField(page, ["price", "lowPrice", "highPrice"]),
    );
    return detected(
      "product-prices",
      "Product prices",
      "high",
      `Offer or price fields in JSON-LD: ${formatEvidenceList(prices)} on ${summarizePages(pagesWithOfferSchema, 2)}`,
      pagesWithOfferSchema.map((page) => page.url),
      pagesWithOfferSchema[0].url,
    );
  }

  for (const page of crawlable) {
    const haystack = pageSearchText(page);
    if (/\$[\d,.]+|\bUSD\b|\bEUR\b|\bGBP\b|£[\d,.]+|€[\d,.]+/.test(haystack)) {
      pagesWithPriceMeta.push(page);
    }
  }

  if (pagesWithPriceMeta.length > 0) {
    const built = buildFindingFromPages(
      pagesWithPriceMeta,
      "Currency or price pattern in page content",
    );
    if (built) {
      return detected(
        "product-prices",
        "Product prices",
        "low",
        built.evidence,
        built.evidenceUrls,
        built.sourceUrl,
      );
    }
  }

  return missing("product-prices", "Product prices", data.entryUrl);
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

function checkPolicyOrSupportPage(
  id: string,
  label: string,
  data: CrawlData,
  urlPatterns: RegExp[],
  contentPatterns: RegExp[],
  linkPatterns: RegExp[],
): Finding {
  return checkPageDiscovery(id, label, data, urlPatterns, contentPatterns, linkPatterns);
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

  const links = findLinks(data.pages, [
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
      );
    }

    return needsReview(
      "cart-checkout-pages",
      "Cart or checkout pages",
      "low",
      `Checkout or cart link(s) found but target page was not successfully crawled: ${formatLinkEvidence(links)}`,
      uniqueUrls(links.map((link) => link.href)),
      links[0].sourceUrl,
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

  const links = findLinks(data.pages, [
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
      `Keyword match only in internal links: ${formatLinkEvidence(links)}`,
      uniqueUrls(links.map((link) => link.href)),
      links[0].sourceUrl,
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

export function runChecks(data: CrawlData): {
  platform: PlatformAnalysis;
  findings: Finding[];
} {
  const platform = detectPlatform(data);

  const findings: Finding[] = [
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
    checkPricingInformation(data),
    checkProductPrices(data),
    checkProductAvailability(data),
    checkPolicyOrSupportPage(
      "shipping-page",
      "Shipping page",
      data,
      [/shipping/i, /delivery/i, /\/ship(ping)?\b/i],
      [/shipping policy/i, /delivery information/i, /\bshipping\b/i],
      [/shipping/i, /delivery/i],
    ),
    checkPolicyOrSupportPage(
      "returns-page",
      "Returns page",
      data,
      [/returns?/i, /\/returns?\b/i],
      [/return policy/i, /returns & exchanges/i],
      [/return/i, /\/returns?\b/i],
    ),
    checkPolicyOrSupportPage(
      "refund-page",
      "Refund page",
      data,
      [/refund/i, /\/refund/i],
      [/refund policy/i, /\brefund\b/i],
      [/refund/i],
    ),
    checkPolicyOrSupportPage(
      "faq-page",
      "FAQ page",
      data,
      [/faq/i, /\/faq\b/i, /help.?center/i],
      [/frequently asked questions/i, /\bfaq\b/i],
      [/faq/i, /help.?center/i],
    ),
    checkPolicyOrSupportPage(
      "contact-page",
      "Contact page",
      data,
      [/contact/i, /\/contact\b/i, /support/i],
      [/contact us/i, /customer support/i],
      [/contact/i, /support/i],
    ),
    checkCartCheckout(data, platform),
    checkApiDeveloperDocs(data),
    checkPolicyOrSupportPage(
      "return-policy-page",
      "Return policy page",
      data,
      [/return/i, /refund/i, /exchange/i, /\/returns?\b/i],
      [/return policy/i, /refund policy/i],
      [/return/i, /refund/i],
    ),
    checkPolicyOrSupportPage(
      "pricing-page",
      "Pricing page",
      data,
      [/pricing/i, /\/price(s)?\b/i, /\/plans?\b/i],
      [/pricing/i, /plans & pricing/i],
      [/pricing/i, /\/price(s)?\b/i],
    ),
    checkPolicyOrSupportPage(
      "checkout-cart-links",
      "Checkout or cart links",
      data,
      [/checkout/i, /\/cart\b/i, /\/bag\b/i],
      [/checkout/i, /\bcart\b/i],
      [/checkout/i, /\/cart\b/i, /\bcart\b/i],
    ),
  ];

  return { platform, findings };
}

export function groupFindings(findings: Finding[]): GroupedFindings {
  return {
    detected: findings.filter((finding) => finding.status === "detected"),
    missing: findings.filter((finding) => finding.status === "missing"),
    needsReview: findings.filter((finding) => finding.status === "needs_review"),
  };
}
