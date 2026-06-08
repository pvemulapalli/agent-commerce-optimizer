import fixtures from "@/data/magento-detection-fixtures.json";
import { detectPlatform } from "@/lib/platform";
import { assessEcommerceEligibility } from "@/lib/ecommerce-eligibility";
import { finalizeFindings } from "@/lib/checks";
import type { CrawlData, Finding, PageData } from "@/lib/types";

interface MagentoFixture {
  merchant: string;
  url: string;
  htmlSnippet: string;
  urls: string[];
}

const emptyResource = {
  url: "",
  status: null,
  content: null,
  contentType: null,
};

function buildCrawlData(fixture: MagentoFixture): CrawlData {
  const entryUrl = fixture.url;
  const origin = new URL(entryUrl).origin;

  const pages: PageData[] = fixture.urls.map((url) => ({
    url,
    title: fixture.merchant,
    metaDescription: null,
    bodyTextSnippet: fixture.htmlSnippet,
    htmlSnippet: fixture.htmlSnippet,
    jsonLdBlocks: [],
    schemaTypes: [],
    discoveredLinks: [],
    internalLinks: [],
    status: 200,
  }));

  return {
    entryUrl,
    origin,
    pages,
    resources: {
      robotsTxt: emptyResource,
      sitemapXml: emptyResource,
      llmsTxt: emptyResource,
      llmsFullTxt: emptyResource,
    },
    sitemap: {
      sitemapUrls: [],
      urlsDiscovered: fixture.urls.length,
      urlsSelected: fixture.urls,
      urlsCrawled: fixture.urls,
    },
    relatedDomain: {
      urlsSelected: [],
      urlsCrawled: [],
    },
    crawledAt: new Date().toISOString(),
  };
}

function buildCartFindings(): Finding[] {
  return [
    {
      id: "cart-checkout-pages",
      label: "Cart / Checkout Pages",
      status: "detected",
      confidence: "medium",
      evidence: "Cart or checkout URL on crawled page",
      evidenceUrls: ["https://www.cabinets.com/checkout/cart"],
      sourceUrl: "https://www.cabinets.com/checkout/cart",
      discoveredFromUrl: "https://www.cabinets.com/",
    },
  ];
}

function main() {
  let passed = 0;

  for (const fixture of fixtures as MagentoFixture[]) {
    const crawl = buildCrawlData(fixture);
    const platform = detectPlatform(crawl);
    const findings = finalizeFindings(buildCartFindings(), platform);
    const assessment = assessEcommerceEligibility({
      findings,
      platform,
      crawlData: crawl,
    });

    const ok =
      platform.platform === "Magento" &&
      platform.confidence !== "low" &&
      assessment.eligible;

    console.log(
      `[${ok ? "PASS" : "FAIL"}] ${fixture.merchant} -> ${platform.platform} (${platform.confidence}, ${platform.confidenceScore}) eligible=${assessment.eligible}`,
    );

    if (ok) {
      passed += 1;
    }
  }

  if (passed < fixtures.length) {
    console.error("Magento validation failed.");
    process.exit(1);
  }

  console.log("Magento validation passed.");
}

main();
