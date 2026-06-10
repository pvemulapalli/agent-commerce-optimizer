import fixtures from "@/data/commercetools-detection-fixtures.json";
import { detectPlatform } from "@/lib/platform";
import type { CrawlData, PageData } from "@/lib/types";

interface CommercetoolsFixture {
  name: string;
  entryUrl: string;
  expectedPlatform: string;
  expectedConfidence: string;
  htmlSnippet: string;
  urls: string[];
}

const emptyResource = {
  url: "",
  status: null,
  content: null,
  contentType: null,
};

function buildCrawlData(fixture: CommercetoolsFixture): CrawlData {
  const origin = new URL(fixture.entryUrl).origin;

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
    entryUrl: fixture.entryUrl,
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

let passed = 0;

for (const fixture of fixtures as CommercetoolsFixture[]) {
  const analysis = detectPlatform(buildCrawlData(fixture));
  const ok =
    analysis.platform === fixture.expectedPlatform &&
    analysis.confidence === fixture.expectedConfidence;

  console.log(
    `${ok ? "PASS" : "FAIL"} ${fixture.name}: ${analysis.platform} (${analysis.confidence}, score ${analysis.confidenceScore})`,
  );

  if (ok) {
    passed += 1;
  }
}

console.log(`\n${passed}/${fixtures.length} commercetools fixtures passed.`);

if (passed < fixtures.length) {
  process.exitCode = 1;
}
