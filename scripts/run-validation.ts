#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import {
  buildValidationReport,
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

    const status = result.error
      ? "ERROR"
      : result.platformMatch
        ? "PASS"
        : "MISMATCH";

    console.log(
      `  ${status} | platform ${result.detectedPlatform} (${result.platformConfidence}) | cache ${result.cacheStatus}`,
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
  console.log(`Cache hits: ${report.summary.cacheHits}`);
  console.log(`Errors: ${report.summary.errors}`);
  console.log(`JSON report: ${jsonPath}`);
  console.log(`Markdown report: ${markdownPath}`);

  process.exit(report.summary.errors > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
