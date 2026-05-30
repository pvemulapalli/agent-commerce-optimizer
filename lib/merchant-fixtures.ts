import merchantsFixture from "@/fixtures/merchants.json";
import { crawlSite } from "@/lib/crawler";
import { groupFindings, runChecks } from "@/lib/checks";
import type {
  CommercePlatform,
  MerchantFixture,
  MerchantValidationResult,
} from "@/lib/types";
import { z } from "zod";

const merchantFixtureSchema = z.object({
  platform: z.enum([
    "Shopify",
    "BigCommerce",
    "Salesforce Commerce Cloud",
    "WooCommerce",
    "Wix",
    "Squarespace",
    "Magento",
    "CommerceTools",
    "Unknown",
  ]),
  merchant: z.string().min(1),
  url: z.string().url(),
});

const merchantsFileSchema = z.array(merchantFixtureSchema);

export function loadMerchantFixtures(): MerchantFixture[] {
  return merchantsFileSchema.parse(merchantsFixture);
}

export async function validateMerchantFixture(
  fixture: MerchantFixture,
): Promise<MerchantValidationResult> {
  try {
    const crawlData = await crawlSite(fixture.url);
    const { platform, findings } = runChecks(crawlData);
    const grouped = groupFindings(findings);

    return {
      merchant: fixture.merchant,
      url: crawlData.entryUrl,
      expectedPlatform: fixture.platform,
      detectedPlatform: platform.platform,
      platformConfidence: platform.confidence,
      platformMatch: platform.platform === fixture.platform,
      crawledAt: crawlData.crawledAt,
      findingCounts: {
        detected: grouped.detected.length,
        missing: grouped.missing.length,
        needsReview: grouped.needsReview.length,
      },
    };
  } catch (error) {
    return {
      merchant: fixture.merchant,
      url: fixture.url,
      expectedPlatform: fixture.platform,
      detectedPlatform: "Unknown",
      platformConfidence: "low",
      platformMatch: false,
      crawledAt: new Date().toISOString(),
      findingCounts: {
        detected: 0,
        missing: 0,
        needsReview: 0,
      },
      error: error instanceof Error ? error.message : "Validation failed",
    };
  }
}

export async function validateAllMerchantFixtures(): Promise<{
  results: MerchantValidationResult[];
  summary: {
    total: number;
    platformMatches: number;
    failures: number;
  };
}> {
  const fixtures = loadMerchantFixtures();
  const results: MerchantValidationResult[] = [];

  for (const fixture of fixtures) {
    results.push(await validateMerchantFixture(fixture));
  }

  const platformMatches = results.filter((result) => result.platformMatch).length;
  const failures = results.filter((result) => result.error).length;

  return {
    results,
    summary: {
      total: results.length,
      platformMatches,
      failures,
    },
  };
}

export function formatValidationReport(
  results: MerchantValidationResult[],
): string {
  const lines = results.map((result) => {
    const status = result.error
      ? "ERROR"
      : result.platformMatch
        ? "PASS"
        : "MISMATCH";

    const platformLine = result.error
      ? result.error
      : `expected ${result.expectedPlatform}, detected ${result.detectedPlatform} (${result.platformConfidence})`;

    return `[${status}] ${result.merchant} (${result.url}) — ${platformLine}`;
  });

  return lines.join("\n");
}

export type { CommercePlatform };
