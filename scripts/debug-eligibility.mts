import { crawlSite } from "../lib/crawler";
import { runChecks, finalizeFindings } from "../lib/checks";
import { assessEcommerceEligibility } from "../lib/ecommerce-eligibility";

const url = process.argv[2] ?? "https://www.jimmysburgerandgrill.com";

async function main() {
  const crawlData = await crawlSite(url);
  const { platform, findings } = runChecks(crawlData);
  const finalized = finalizeFindings(findings, platform);
  const assessment = assessEcommerceEligibility({
    findings: finalized,
    platform,
    crawlData,
  });

  console.log("URL:", url);
  console.log("Platform:", platform.platform, platform.confidence);
  console.log("Platform evidence:", platform.evidence.slice(0, 5));
  console.log("Confidence:", assessment.ecommerceConfidence, "eligible:", assessment.eligible);
  console.log("Reason:", assessment.reason);
  console.log("Signals:", assessment.signals);
  console.log("\nDetected findings:");
  for (const f of finalized.filter((x) => x.status === "detected")) {
    console.log(` - ${f.id}: ${f.label}`);
    console.log(`   evidence: ${f.evidence.slice(0, 120)}`);
  }
  console.log("\nPages crawled:", crawlData.pages.length);
  for (const p of crawlData.pages.slice(0, 12)) {
    console.log(`  ${p.url}`);
    console.log(`    title: ${(p.title || "").slice(0, 80)}`);
    if (p.schemaTypes.length) console.log(`    schema: ${p.schemaTypes.join(", ")}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
