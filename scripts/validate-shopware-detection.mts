import fixtures from "@/data/shopware-detection-fixtures.json";
import { detectPlatform } from "@/lib/platform";
import type { CrawlData, PageData } from "@/lib/types";

const MIN_SHOPWARE_DETECTIONS = 8;

interface ShopwareFixture {
  merchant: string;
  url: string;
  htmlSnippet: string;
  urls: string[];
  robotsTxt?: string;
}

const emptyResource = {
  url: "",
  status: null,
  content: null,
  contentType: null,
};

function buildCrawlData(fixture: ShopwareFixture): CrawlData {
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
      robotsTxt: {
        ...emptyResource,
        url: `${origin}/robots.txt`,
        content: fixture.robotsTxt ?? "",
        status: fixture.robotsTxt ? 200 : null,
      },
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

function main() {
  const results = (fixtures as ShopwareFixture[]).map((fixture) => {
    const analysis = detectPlatform(buildCrawlData(fixture));
    return {
      merchant: fixture.merchant,
      url: fixture.url,
      detectedPlatform: analysis.platform,
      confidence: analysis.confidence,
      confidenceScore: analysis.confidenceScore,
      evidence: analysis.evidence.slice(0, 4),
    };
  });

  const shopwareMatches = results.filter((result) => result.detectedPlatform === "Shopware");
  const passed = shopwareMatches.length >= MIN_SHOPWARE_DETECTIONS;

  console.log("Shopware detection validation");
  console.log("============================");
  for (const result of results) {
    const marker = result.detectedPlatform === "Shopware" ? "PASS" : "MISS";
    console.log(
      `[${marker}] ${result.merchant} -> ${result.detectedPlatform} (${result.confidence}, ${result.confidenceScore})`,
    );
  }

  console.log("");
  console.log(
    `Detected Shopware on ${shopwareMatches.length}/${results.length} fixtures (required: ${MIN_SHOPWARE_DETECTIONS}).`,
  );

  if (!passed) {
    console.error("Shopware validation failed.");
    process.exit(1);
  }

  console.log("Shopware validation passed.");
}

main();
