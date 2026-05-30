import testSites from "@/data/test-sites.json";
import { getCacheTtlMinutes } from "@/lib/cache";
import { runAudit } from "@/lib/run-audit";
import type {
  AuditApiResponse,
  CacheStatus,
  CommercePlatform,
  ConfidenceLevel,
  Finding,
  FindingStatus,
} from "@/lib/types";
import { z } from "zod";

const testSiteSchema = z.object({
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

export type TestSite = z.infer<typeof testSiteSchema>;

export interface SignalSnapshot {
  status: FindingStatus;
  confidence: ConfidenceLevel;
  evidence: string;
  sourceUrl: string;
}

export interface SiteValidationResult {
  merchant: string;
  url: string;
  auditedUrl: string;
  expectedPlatform: CommercePlatform;
  detectedPlatform: CommercePlatform;
  platformConfidence: ConfidenceLevel;
  platformMatch: boolean;
  cacheStatus: CacheStatus;
  crawledAt: string;
  expiresAt: string | null;
  signals: {
    robotsTxt: SignalSnapshot;
    sitemapXml: SignalSnapshot;
    llmsTxt: SignalSnapshot;
    productSchema: SignalSnapshot;
    offerSchema: SignalSnapshot;
    organizationSchema: SignalSnapshot;
    productPages: SignalSnapshot;
    collectionCategoryPages: SignalSnapshot;
    productPrices: SignalSnapshot;
    productAvailability: SignalSnapshot;
    shippingDeliveryPage: SignalSnapshot;
    returnsRefundPage: SignalSnapshot;
    faqHelpCenter: SignalSnapshot;
    contactSupportPage: SignalSnapshot;
    cartCheckout: SignalSnapshot;
    apiDeveloperDocs: SignalSnapshot;
  };
  falsePositives: string[];
  missedObviousSignals: string[];
  notes: string[];
  error?: string;
}

export interface ValidationReport {
  generatedAt: string;
  cacheTtlMinutes: number;
  summary: {
    totalSites: number;
    platformMatches: number;
    platformMismatches: number;
    cacheHits: number;
    cacheMisses: number;
    cacheBypasses: number;
    errors: number;
  };
  sites: SiteValidationResult[];
}

const SIGNAL_MAP = {
  robotsTxt: ["robots-txt"],
  sitemapXml: ["sitemap-xml"],
  llmsTxt: ["llms-txt"],
  productSchema: ["product-schema"],
  offerSchema: ["offer-schema"],
  organizationSchema: ["organization-schema"],
  productPages: ["product-pages"],
  collectionCategoryPages: ["collection-pages", "category-pages", "catalog-pages"],
  productPrices: ["product-prices"],
  productAvailability: ["product-availability"],
  shippingDeliveryPage: ["shipping-page", "delivery-information"],
  returnsRefundPage: ["returns-page", "return-policy-page", "refund-page", "return-portal"],
  faqHelpCenter: ["faq-page", "help-center"],
  contactSupportPage: ["contact-page", "contact-support"],
  cartCheckout: ["cart-checkout-pages", "checkout-cart-links"],
  apiDeveloperDocs: ["api-developer-docs"],
} as const;

export function loadTestSites(): TestSite[] {
  return z.array(testSiteSchema).parse(testSites);
}

function getFinding(findings: Finding[], id: string): Finding | undefined {
  return findings.find((finding) => finding.id === id);
}

function combineSignalStatus(
  findings: Finding[],
  ids: readonly string[],
): SignalSnapshot {
  const matches = ids
    .map((id) => getFinding(findings, id))
    .filter((finding): finding is Finding => Boolean(finding));

  if (matches.length === 0) {
    return {
      status: "missing",
      confidence: "low",
      evidence: "Not Detected",
      sourceUrl: "",
    };
  }

  const rank = (status: FindingStatus) =>
    status === "detected" ? 3 : status === "needs_review" ? 2 : 1;

  const best = matches.reduce((current, candidate) =>
    rank(candidate.status) > rank(current.status) ? candidate : current,
  );

  return {
    status: best.status,
    confidence: best.confidence,
    evidence: best.evidence,
    sourceUrl: best.sourceUrl,
  };
}

function buildSignals(findings: Finding[]): SiteValidationResult["signals"] {
  return Object.fromEntries(
    Object.entries(SIGNAL_MAP).map(([key, ids]) => [
      key,
      combineSignalStatus(findings, ids),
    ]),
  ) as SiteValidationResult["signals"];
}

function detectFalsePositives(
  site: TestSite,
  audit: AuditApiResponse,
): string[] {
  const falsePositives: string[] = [];
  const { findings, platform } = audit;

  if (
    platform.platform !== site.platform &&
    platform.platform !== "Unknown" &&
    platform.confidence !== "low"
  ) {
    falsePositives.push(
      `Platform detected as ${platform.platform} (${platform.confidence}) but test expects ${site.platform}`,
    );
  }

  const apiDocs = getFinding(findings, "api-developer-docs");
  if (
    apiDocs?.status === "detected" &&
    ["Shopify", "BigCommerce", "WooCommerce", "Wix", "Squarespace"].includes(
      site.platform,
    )
  ) {
    falsePositives.push(
      `API/developer docs marked detected on a ${site.platform} storefront; verify this is merchant-specific documentation (${apiDocs.sourceUrl})`,
    );
  }

  const pricingPage = getFinding(findings, "pricing-page");
  const pricingInfo = getFinding(findings, "pricing-information");
  if (
    pricingPage?.status === "detected" &&
    pricingInfo?.status === "detected" &&
    pricingPage.sourceUrl === pricingInfo.sourceUrl &&
    /product/i.test(pricingPage.evidence)
  ) {
    falsePositives.push(
      "Pricing page signal may duplicate product pricing evidence rather than a dedicated pricing page",
    );
  }

  return falsePositives;
}

function detectMissedSignals(
  site: TestSite,
  audit: AuditApiResponse,
): string[] {
  const missed: string[] = [];
  const signals = buildSignals(audit.findings);

  if (!audit.platform.platform || audit.platform.platform === "Unknown") {
    missed.push(`Platform not identified; expected ${site.platform}`);
  } else if (audit.platform.platform !== site.platform) {
    missed.push(
      `Expected platform ${site.platform}, detected ${audit.platform.platform} (${audit.platform.confidence})`,
    );
  }

  const essentials: Array<[keyof SiteValidationResult["signals"], string]> = [
    ["robotsTxt", "robots.txt"],
    ["sitemapXml", "sitemap.xml"],
    ["productPages", "Product pages"],
    ["productPrices", "Product prices"],
  ];

  for (const [key, label] of essentials) {
    if (signals[key].status === "missing") {
      missed.push(`${label} not detected`);
    }
  }

  if (signals.shippingDeliveryPage.status === "missing") {
    missed.push("No shipping or delivery page signal detected");
  }

  if (signals.returnsRefundPage.status === "missing") {
    missed.push("No returns or refund page signal detected");
  }

  if (signals.faqHelpCenter.status === "missing") {
    missed.push("No FAQ or help center signal detected");
  }

  if (signals.cartCheckout.status === "missing") {
    missed.push("No cart or checkout signal detected");
  }

  if (site.platform === "Shopify" && signals.collectionCategoryPages.status === "missing") {
    missed.push("Collection pages not detected (common on Shopify storefronts)");
  }

  if (
    site.platform === "BigCommerce" &&
    signals.collectionCategoryPages.status === "missing"
  ) {
    missed.push("Category pages not detected (common on BigCommerce storefronts)");
  }

  return missed;
}

function buildNotes(site: TestSite, audit: AuditApiResponse): string[] {
  const notes: string[] = [];

  if (audit.url !== site.url && audit.url.replace(/\/$/, "") !== site.url.replace(/\/$/, "")) {
    notes.push(`Audited URL resolved to ${audit.url}`);
  }

  if (audit.cacheStatus === "HIT") {
    notes.push(
      `Served from cache; expires at ${audit.expiresAt ? new Date(audit.expiresAt).toISOString() : "unknown"}`,
    );
  }

  if (audit.grouped.needsReview.length > 0) {
    notes.push(
      `${audit.grouped.needsReview.length} finding(s) marked needs review: ${audit.grouped.needsReview
        .map((finding) => finding.label)
        .join(", ")}`,
    );
  }

  return notes;
}

export async function validateTestSite(site: TestSite): Promise<SiteValidationResult> {
  try {
    const audit = await runAudit(site.url);
    const signals = buildSignals(audit.findings);

    return {
      merchant: site.merchant,
      url: site.url,
      auditedUrl: audit.url,
      expectedPlatform: site.platform,
      detectedPlatform: audit.platform.platform,
      platformConfidence: audit.platform.confidence,
      platformMatch: audit.platform.platform === site.platform,
      cacheStatus: audit.cacheStatus,
      crawledAt: audit.crawledAt,
      expiresAt: audit.expiresAt,
      signals,
      falsePositives: detectFalsePositives(site, audit),
      missedObviousSignals: detectMissedSignals(site, audit),
      notes: buildNotes(site, audit),
    };
  } catch (error) {
    return {
      merchant: site.merchant,
      url: site.url,
      auditedUrl: site.url,
      expectedPlatform: site.platform,
      detectedPlatform: "Unknown",
      platformConfidence: "low",
      platformMatch: false,
      cacheStatus: getCacheTtlMinutes() > 0 ? "MISS" : "BYPASS",
      crawledAt: new Date().toISOString(),
      expiresAt: null,
      signals: buildSignals([]),
      falsePositives: [],
      missedObviousSignals: [`Audit failed: ${error instanceof Error ? error.message : "Unknown error"}`],
      notes: [],
      error: error instanceof Error ? error.message : "Validation failed",
    };
  }
}

export function buildValidationReport(results: SiteValidationResult[]): ValidationReport {
  return {
    generatedAt: new Date().toISOString(),
    cacheTtlMinutes: getCacheTtlMinutes(),
    summary: {
      totalSites: results.length,
      platformMatches: results.filter((result) => result.platformMatch && !result.error).length,
      platformMismatches: results.filter(
        (result) => !result.platformMatch && !result.error,
      ).length,
      cacheHits: results.filter((result) => result.cacheStatus === "HIT").length,
      cacheMisses: results.filter((result) => result.cacheStatus === "MISS").length,
      cacheBypasses: results.filter((result) => result.cacheStatus === "BYPASS").length,
      errors: results.filter((result) => result.error).length,
    },
    sites: results,
  };
}

function statusLabel(snapshot: SignalSnapshot): string {
  return snapshot.status.replace("_", " ");
}

function markdownSignalRow(label: string, snapshot: SignalSnapshot): string {
  return `| ${label} | ${statusLabel(snapshot)} | ${snapshot.confidence} | ${snapshot.evidence.replace(/\|/g, "\\|").slice(0, 120)} |`;
}

export function formatValidationMarkdown(report: ValidationReport): string {
  const lines: string[] = [
    "# Ecommerce Platform Validation Report",
    "",
    `Generated: ${report.generatedAt}`,
    `Cache TTL (minutes): ${report.cacheTtlMinutes}`,
    "",
    "## Summary",
    "",
    "| Metric | Count |",
    "| --- | ---: |",
    `| Total sites | ${report.summary.totalSites} |`,
    `| Platform matches | ${report.summary.platformMatches} |`,
    `| Platform mismatches | ${report.summary.platformMismatches} |`,
    `| Cache hits | ${report.summary.cacheHits} |`,
    `| Cache misses | ${report.summary.cacheMisses} |`,
    `| Cache bypasses | ${report.summary.cacheBypasses} |`,
    `| Errors | ${report.summary.errors} |`,
    "",
    "## Summary Table",
    "",
    "| Merchant | Expected Platform | Detected Platform | Confidence | Platform Match | Cache | Products | Prices | FAQ/Help | Returns | Cart |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ];

  for (const site of report.sites) {
    lines.push(
      `| ${site.merchant} | ${site.expectedPlatform} | ${site.detectedPlatform} | ${site.platformConfidence} | ${site.platformMatch ? "yes" : "no"} | ${site.cacheStatus} | ${statusLabel(site.signals.productPages)} | ${statusLabel(site.signals.productPrices)} | ${statusLabel(site.signals.faqHelpCenter)} | ${statusLabel(site.signals.returnsRefundPage)} | ${statusLabel(site.signals.cartCheckout)} |`,
    );
  }

  lines.push("", "## Detailed Results", "");

  for (const site of report.sites) {
    lines.push(`### ${site.merchant}`);
    lines.push("");
    lines.push(`- URL: ${site.url}`);
    lines.push(`- Audited URL: ${site.auditedUrl}`);
    lines.push(`- Expected platform: ${site.expectedPlatform}`);
    lines.push(`- Detected platform: ${site.detectedPlatform} (${site.platformConfidence})`);
    lines.push(`- Platform match: ${site.platformMatch ? "yes" : "no"}`);
    lines.push(`- Cache status: ${site.cacheStatus}`);
    lines.push(`- Crawled at: ${site.crawledAt}`);
    if (site.expiresAt) {
      lines.push(`- Cache expires at: ${site.expiresAt}`);
    }
    if (site.error) {
      lines.push(`- Error: ${site.error}`);
    }
    lines.push("");
    lines.push("| Signal | Status | Confidence | Evidence |");
    lines.push("| --- | --- | --- | --- |");
    lines.push(markdownSignalRow("robots.txt", site.signals.robotsTxt));
    lines.push(markdownSignalRow("sitemap.xml", site.signals.sitemapXml));
    lines.push(markdownSignalRow("llms.txt", site.signals.llmsTxt));
    lines.push(markdownSignalRow("Product schema", site.signals.productSchema));
    lines.push(markdownSignalRow("Offer schema", site.signals.offerSchema));
    lines.push(markdownSignalRow("Organization schema", site.signals.organizationSchema));
    lines.push(markdownSignalRow("Product pages", site.signals.productPages));
    lines.push(
      markdownSignalRow("Collection/category pages", site.signals.collectionCategoryPages),
    );
    lines.push(markdownSignalRow("Product prices", site.signals.productPrices));
    lines.push(markdownSignalRow("Product availability", site.signals.productAvailability));
    lines.push(markdownSignalRow("Shipping/delivery page", site.signals.shippingDeliveryPage));
    lines.push(markdownSignalRow("Returns/refund page", site.signals.returnsRefundPage));
    lines.push(markdownSignalRow("FAQ/help center", site.signals.faqHelpCenter));
    lines.push(markdownSignalRow("Contact/support page", site.signals.contactSupportPage));
    lines.push(markdownSignalRow("Cart/checkout", site.signals.cartCheckout));
    lines.push(markdownSignalRow("API/developer docs", site.signals.apiDeveloperDocs));
    lines.push("");

    if (site.falsePositives.length > 0) {
      lines.push("**False positives**");
      for (const item of site.falsePositives) {
        lines.push(`- ${item}`);
      }
      lines.push("");
    }

    if (site.missedObviousSignals.length > 0) {
      lines.push("**Missed obvious signals**");
      for (const item of site.missedObviousSignals) {
        lines.push(`- ${item}`);
      }
      lines.push("");
    }

    if (site.notes.length > 0) {
      lines.push("**Notes**");
      for (const item of site.notes) {
        lines.push(`- ${item}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}
