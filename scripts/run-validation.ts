#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import {
  buildValidationReport,
  formatConsoleStatus,
  formatValidationMarkdown,
  loadTestSites,
  validateTestSite,
} from "../lib/platform-validation";

const REPORTS_DIR = path.join(process.cwd(), "reports");

function loadEnvLocal(): void {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

async function main() {
  loadEnvLocal();

  const sites = loadTestSites();
  const results = [];

  console.log(`Running platform validation for ${sites.length} merchant sites...\n`);

  for (const [index, site] of sites.entries()) {
    console.log(`[${index + 1}/${sites.length}] ${site.merchant} (${site.url})`);
    const result = await validateTestSite(site);
    results.push(result);

    console.log(
      `  ${formatConsoleStatus(result)} | platform ${result.detectedPlatform} (${result.platformConfidence}) | expected confidence ${result.expectedPlatformConfidence} | detection ${result.detectionQuality} | crawl ${result.crawlQuality} | cache ${result.cacheStatus}`,
    );
  }

  const report = buildValidationReport(results);
  mkdirSync(REPORTS_DIR, { recursive: true });

  const jsonPath = path.join(REPORTS_DIR, "validation-results.json");
  const markdownPath = path.join(REPORTS_DIR, "validation-results.md");

  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  writeFileSync(markdownPath, formatValidationMarkdown(report));

  console.log("\nValidation complete.");
  console.log(`Platform matches: ${report.summary.platformMatches}/${report.summary.totalSites}`);
  console.log(
    `Actionable platform mismatches (confirmed only): ${report.summary.actionablePlatformMismatches}`,
  );
  console.log(`Unverified platform reviews: ${report.summary.unverifiedPlatformReviews}`);
  console.log(
    `Detection quality: good ${report.summary.detectionGood}, limited ${report.summary.detectionLimited}, blocked ${report.summary.detectionBlocked}`,
  );
  console.log(
    `Crawl quality: strong ${report.summary.crawlStrong}, partial ${report.summary.crawlPartial}, weak ${report.summary.crawlWeak}`,
  );
  console.log(`Cache hits: ${report.summary.cacheHits}`);
  console.log(`Errors: ${report.summary.errors}`);
  console.log(`JSON report: ${jsonPath}`);
  console.log(`Markdown report: ${markdownPath}`);

  const shouldFail =
    report.summary.errors > 0 || report.summary.actionablePlatformMismatches > 0;

  process.exit(shouldFail ? 1 : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
