import type { CrawlData, Finding, GroupedFindings, PageData } from "./types";

interface LinkMatch {
  href: string;
  text: string;
  sourceUrl: string;
}

function hasSchemaType(pages: PageData[], typeName: string): PageData | null {
  const normalized = typeName.toLowerCase();

  for (const page of pages) {
    const match = page.schemaTypes.some((type) => {
      const value = type.toLowerCase();
      return value === normalized || value.endsWith(`/${normalized}`);
    });
    if (match) return page;
  }

  return null;
}

function findLinks(
  pages: PageData[],
  patterns: RegExp[],
): LinkMatch[] {
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

function detected(
  id: string,
  label: string,
  evidence: string,
  sourceUrl: string,
): Finding {
  return { id, label, status: "detected", evidence, sourceUrl };
}

function missing(id: string, label: string, sourceUrl: string): Finding {
  return {
    id,
    label,
    status: "missing",
    evidence: "Not Detected",
    sourceUrl,
  };
}

function needsReview(
  id: string,
  label: string,
  evidence: string,
  sourceUrl: string,
): Finding {
  return { id, label, status: "needs_review", evidence, sourceUrl };
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
      `HTTP 200. Sample: ${lines.join(" | ")}`,
      robotsTxt.url,
    );
  }

  if (robotsTxt.status && robotsTxt.status !== 404) {
    return needsReview(
      "robots-txt",
      "robots.txt",
      `HTTP ${robotsTxt.status} at ${robotsTxt.url}`,
      robotsTxt.url,
    );
  }

  return missing("robots-txt", "robots.txt", robotsTxt.url);
}

function checkSitemap(data: CrawlData): Finding {
  const { sitemapXml } = data.resources;

  if (sitemapXml.status === 200 && sitemapXml.content?.trim()) {
    const snippet = sitemapXml.content.replace(/\s+/g, " ").slice(0, 120);
    return detected(
      "sitemap-xml",
      "sitemap.xml",
      `HTTP 200. Content preview: ${snippet}${sitemapXml.content.length > 120 ? "…" : ""}`,
      sitemapXml.url,
    );
  }

  if (sitemapXml.status && sitemapXml.status !== 404) {
    return needsReview(
      "sitemap-xml",
      "sitemap.xml",
      `HTTP ${sitemapXml.status} at ${sitemapXml.url}`,
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

    if (llmsFullTxt.status === 200 && llmsFullTxt.content?.trim()) {
      evidence += `; llms-full.txt also present at ${llmsFullTxt.url}`;
    }

    return detected("llms-txt", "llms.txt", evidence, llmsTxt.url);
  }

  if (llmsFullTxt.status === 200 && llmsFullTxt.content?.trim()) {
    return needsReview(
      "llms-txt",
      "llms.txt",
      `llms.txt not found, but llms-full.txt is present at ${llmsFullTxt.url}`,
      llmsFullTxt.url,
    );
  }

  if (llmsTxt.status && llmsTxt.status !== 404) {
    return needsReview(
      "llms-txt",
      "llms.txt",
      `HTTP ${llmsTxt.status} at ${llmsTxt.url}`,
      llmsTxt.url,
    );
  }

  return missing("llms-txt", "llms.txt", llmsTxt.url);
}

function checkProductSchema(data: CrawlData): Finding {
  const page = hasSchemaType(data.pages, "Product");

  if (page) {
    const types = page.schemaTypes.filter((type) =>
      type.toLowerCase().includes("product"),
    );
    return detected(
      "product-schema",
      "Product schema",
      `JSON-LD @type values: ${types.join(", ")}`,
      page.url,
    );
  }

  return missing("product-schema", "Product schema", data.entryUrl);
}

function checkFaqSchema(data: CrawlData): Finding {
  const page = hasSchemaType(data.pages, "FAQPage");

  if (page) {
    return detected(
      "faq-schema",
      "FAQ schema",
      `JSON-LD @type includes FAQPage`,
      page.url,
    );
  }

  return missing("faq-schema", "FAQ schema", data.entryUrl);
}

function checkOrganizationSchema(data: CrawlData): Finding {
  const page = hasSchemaType(data.pages, "Organization");

  if (page) {
    return detected(
      "organization-schema",
      "Organization schema",
      `JSON-LD @type includes Organization`,
      page.url,
    );
  }

  return missing("organization-schema", "Organization schema", data.entryUrl);
}

function checkPageLinks(
  id: string,
  label: string,
  data: CrawlData,
  patterns: RegExp[],
): Finding {
  const matches = findLinks(data.pages, patterns);

  if (matches.length === 0) {
    return missing(id, label, data.entryUrl);
  }

  const crawledMatch = matches.find((match) =>
    data.pages.some(
      (page) => page.url === match.href && page.status === 200 && page.title,
    ),
  );

  if (crawledMatch) {
    const page = data.pages.find((entry) => entry.url === crawledMatch.href)!;
    return detected(
      id,
      label,
      `Link found and page crawled. Title: "${page.title}". ${formatLinkEvidence([crawledMatch])}`,
      crawledMatch.href,
    );
  }

  return needsReview(
    id,
    label,
    `Internal link(s) found but target page was not successfully crawled: ${formatLinkEvidence(matches)}`,
    matches[0].sourceUrl,
  );
}

export function runChecks(data: CrawlData): Finding[] {
  return [
    checkRobotsTxt(data),
    checkSitemap(data),
    checkLlmsTxt(data),
    checkProductSchema(data),
    checkFaqSchema(data),
    checkOrganizationSchema(data),
    checkPageLinks("pricing-page", "Pricing page", data, [
      /pricing/,
      /\/price(s)?\b/,
      /\/plans?\b/,
    ]),
    checkPageLinks("shipping-page", "Shipping page", data, [
      /shipping/,
      /delivery/,
      /\/ship(ping)?\b/,
    ]),
    checkPageLinks("return-policy-page", "Return policy page", data, [
      /return/,
      /refund/,
      /exchange/,
      /\/returns?\b/,
    ]),
    checkPageLinks("contact-page", "Contact page", data, [
      /contact/,
      /support/,
      /\/contact\b/,
      /help.?center/,
    ]),
    checkPageLinks("checkout-cart-links", "Checkout or cart links", data, [
      /checkout/,
      /\/cart\b/,
      /\bcart\b/,
      /\/bag\b/,
      /add-to-cart/,
    ]),
    checkPageLinks("api-developer-docs", "API or developer docs links", data, [
      /\/api\b/,
      /developer/,
      /\/docs?\b/,
      /documentation/,
      /dev\.portal/,
    ]),
  ];
}

export function groupFindings(findings: Finding[]): GroupedFindings {
  return {
    detected: findings.filter((finding) => finding.status === "detected"),
    missing: findings.filter((finding) => finding.status === "missing"),
    needsReview: findings.filter((finding) => finding.status === "needs_review"),
  };
}
