import { crawlSite } from "../lib/crawler";
import { runChecks, finalizeFindings } from "../lib/checks";
import { detectPlatform } from "../lib/platform";
import { assessEcommerceEligibility } from "../lib/ecommerce-eligibility";

const url = process.argv[2] ?? "https://www.merchantsignals.com";

async function main() {
  const crawl = await crawlSite(url);
  const { platform, findings } = runChecks(crawl);
  const finalized = finalizeFindings(findings, platform);
  const assessment = assessEcommerceEligibility({
    findings: finalized,
    platform,
    crawlData: crawl,
  });

  console.log("URL:", url);
  console.log(
    "Platform:",
    platform.platform,
    platform.confidence,
    "score:",
    platform.confidenceScore,
  );
  if (platform.signalBreakdown) {
    console.log("Signal breakdown:", platform.signalBreakdown);
  }
  if (crawl.hosting) {
    console.log("Hosting:", {
      ipv4: crawl.hosting.ipv4.slice(0, 2),
      cnames: crawl.hosting.cnames,
      reverseDns: crawl.hosting.reverseDns.slice(0, 2),
      asn: crawl.hosting.asnOrganization,
      genericCdn: crawl.hosting.genericCdn,
    });
  }
  console.log("Evidence:");
  for (const item of platform.evidence) {
    console.log(" -", item);
  }
  console.log(
    "Eligible:",
    assessment.eligible,
    "score:",
    assessment.ecommerceConfidence,
    assessment.signals,
  );
  console.log(
    "Detected findings:",
    finalized.filter((finding) => finding.status === "detected").map((finding) => finding.id),
  );

  for (const id of [
    "product-pages",
    "catalog-pages",
    "cart-checkout-pages",
    "checkout-cart-links",
    "product-prices",
  ]) {
    const finding = finalized.find((entry) => entry.id === id);
    if (finding?.status === "detected") {
      console.log("\n", id, finding.evidence.slice(0, 300));
      console.log(" urls:", finding.evidenceUrls.slice(0, 5).join(", "));
    }
  }

  for (const page of crawl.pages.slice(0, 5)) {
    const content = [
      page.htmlSnippet ?? "",
      page.bodyTextSnippet ?? "",
      JSON.stringify(page.jsonLdBlocks ?? []),
    ].join(" ");
    const hits: string[] = [];
    if (/data-mage-init|text\/x-magento-init|Magento_Ui|mage\/requirejs/i.test(content)) {
      hits.push("mage-init");
    }
    if (/\/static\/frontend\/|mage-cache-storage|form-key|x-magento-vary/i.test(content)) {
      hits.push("static-frontend");
    }
    if (/mage\/cookies|catalog\/product\/view|customer\/section\/load|price-box|data-product-id/i.test(content)) {
      hits.push("catalog-runtime");
    }
    if (/adobe-client-data-layer|adobeDataLayer|commerce\.adobe|checkoutConfig/i.test(content)) {
      hits.push("adobe-runtime");
    }
    if (/\bmagento\b/i.test(content)) {
      hits.push("word-magento");
    }
    if (hits.length > 0) {
      console.log("Page signals:", page.url, hits.join(", "));
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
