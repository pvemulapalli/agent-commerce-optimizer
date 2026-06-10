import fixtures from "@/data/bigcommerce-detection-fixtures.json";
import { detectPlatform } from "@/lib/platform";
import type { ConfidenceLevel, CrawlData, PageData } from "@/lib/types";

const MIN_BIGCOMMERCE_DETECTIONS = 3;

interface BigCommerceFixture {
  name: string;
  entryUrl: string;
  expectedPlatform: "BigCommerce";
  expectedConfidence: ConfidenceLevel;
  htmlSnippet: string;
  urls: string[];
}

const emptyResource = {
  url: "",
  status: null,
  content: null,
  contentType: null,
};

function buildCrawlData(fixture: BigCommerceFixture): CrawlData {
  const entryUrl = fixture.entryUrl;
  const origin = new URL(entryUrl).origin;

  const pages: PageData[] = fixture.urls.map((url) => ({
    url,
    title: fixture.name,
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

function confidenceRank(confidence: ConfidenceLevel): number {
  if (confidence === "high") return 3;
  if (confidence === "medium") return 2;
  return 1;
}

async function main() {
  const results = (fixtures as BigCommerceFixture[]).map((fixture) => {
    const crawlData = buildCrawlData(fixture);
    const platform = detectPlatform(crawlData);

    return {
      name: fixture.name,
      detectedPlatform: platform.platform,
      detectedConfidence: platform.confidence,
      expectedPlatform: fixture.expectedPlatform,
      expectedConfidence: fixture.expectedConfidence,
      passed:
        platform.platform === fixture.expectedPlatform &&
        confidenceRank(platform.confidence) >= confidenceRank(fixture.expectedConfidence),
    };
  });

  const bigCommerceMatches = results.filter((result) => result.passed);

  console.log("BigCommerce detection validation");
  for (const result of results) {
    const marker = result.passed ? "PASS" : "MISS";
    console.log(
      `[${marker}] ${result.name}: ${result.detectedPlatform} (${result.detectedConfidence})`,
    );
  }

  console.log(
    `\nDetected BigCommerce on ${bigCommerceMatches.length}/${results.length} fixtures (required: ${MIN_BIGCOMMERCE_DETECTIONS}).`,
  );

  if (bigCommerceMatches.length < MIN_BIGCOMMERCE_DETECTIONS) {
    console.error("BigCommerce validation failed.");
    process.exit(1);
  }

  console.log("BigCommerce validation passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
