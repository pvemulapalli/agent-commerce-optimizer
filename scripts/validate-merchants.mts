#!/usr/bin/env node
import {
  formatValidationReport,
  loadMerchantFixtures,
  validateAllMerchantFixtures,
  validateMerchantFixture,
} from "../lib/merchant-fixtures";

async function main() {
  const merchantArg = process.argv.find((arg) => arg.startsWith("--merchant="));
  const merchantName = merchantArg?.split("=")[1];

  if (merchantName) {
    const fixture = loadMerchantFixtures().find(
      (entry) => entry.merchant.toLowerCase() === merchantName.toLowerCase(),
    );

    if (!fixture) {
      console.error(`Merchant fixture not found: ${merchantName}`);
      console.error(
        `Available merchants: ${loadMerchantFixtures()
          .map((entry) => entry.merchant)
          .join(", ")}`,
      );
      process.exit(1);
    }

    const result = await validateMerchantFixture(fixture);
    console.log(formatValidationReport([result]));
    process.exit(result.platformMatch && !result.error ? 0 : 1);
  }

  console.log(`Running validation for ${loadMerchantFixtures().length} merchant fixture(s)...\n`);
  const { results, summary } = await validateAllMerchantFixtures();

  console.log(formatValidationReport(results));
  console.log(
    `\nSummary: ${summary.platformMatches}/${summary.total} platform matches, ${summary.failures} error(s)`,
  );

  process.exit(
    summary.failures === 0 && summary.platformMatches === summary.total ? 0 : 1,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
