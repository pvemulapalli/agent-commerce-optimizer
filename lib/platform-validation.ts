import testSites from "@/data/test-sites.json";
import {
  assessCrawlQuality,
  assessDetectionQuality,
  BLOCKED_CRAWL_MESSAGE,
  type CrawlQuality,
  type DetectionQuality,
} from "@/lib/crawl-quality";
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

export type ExpectedPlatformConfidence = "confirmed" | "unverified" | "likely_outdated";
export type ValidationOutcome = "pass" | "review" | "mismatch" | "error";

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
  expectedPlatformConfidence: z
    .enum(["confirmed", "unverified", "likely_outdated"])
    .default("unverified"),
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
  expectedPlatformConfidence: ExpectedPlatformConfidence;
  detectedPlatform: CommercePlatform;
  platformConfidence: ConfidenceLevel;
  platformMatch: boolean;
  validationOutcome: ValidationOutcome;
  actionablePlatformMismatch: boolean;
  detectionQuality: DetectionQuality;
  crawlQuality: CrawlQuality;
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
    actionablePlatformMismatches: number;
    unverifiedPlatformReviews: number;
    detectionGood: number;
    detectionLimited: number;
    detectionBlocked: number;
    crawlStrong: number;
    crawlPartial: number;
    crawlWeak: number;
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

function resolveValidationOutcome(input: {
  error?: string;
  platformMatch: boolean;
  expectedPlatformConfidence: ExpectedPlatformConfidence;
}): ValidationOutcome {
  if (input.error) return "error";
  if (input.platformMatch) return "pass";

  if (input.expectedPlatformConfidence === "confirmed") {
    return "mismatch";
  }

  return "review";
}

function isActionablePlatformMismatch(
  platformMatch: boolean,
  expectedPlatformConfidence: ExpectedPlatformConfidence,
): boolean {
  return !platformMatch && expectedPlatformConfidence === "confirmed";
}

function detectFalsePositives(
  site: TestSite,
  audit: AuditApiResponse,
): string[] {
  const falsePositives: string[] = [];
  const { findings, platform } = audit;

  if (
    site.expectedPlatformConfidence === "confirmed" &&
    platform.platform !== site.platform &&
    platform.platform !== "Unknown" &&
    platform.confidence !== "low"
  ) {
    falsePositives.push(
      `Platform detected as ${platform.platform} (${platform.confidence}) but confirmed test expects ${site.platform}`,
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
  detectionQuality: DetectionQuality,
): string[] {
  const missed: string[] = [];
  const signals = buildSignals(audit.findings);

  if (detectionQuality === "blocked") {
    missed.push(BLOCKED_CRAWL_MESSAGE);
    return missed;
  }

  if (site.expectedPlatformConfidence === "confirmed") {
    if (!audit.platform.platform || audit.platform.platform === "Unknown") {
      missed.push(`Platform not identified; confirmed expectation is ${site.platform}`);
    } else if (audit.platform.platform !== site.platform) {
      missed.push(
        `Confirmed expected platform ${site.platform}, detected ${audit.platform.platform} (${audit.platform.confidence})`,
      );
    }
  } else if (
    !audit.platform.platform ||
    audit.platform.platform === "Unknown" ||
    audit.platform.platform !== site.platform
  ) {
    missed.push(
      `Expected platform label is ${site.platform} (${site.expectedPlatformConfidence}); detected ${audit.platform.platform} (${audit.platform.confidence}). Expected platform source is not confirmed.`,
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

  if (
    site.expectedPlatformConfidence === "confirmed" &&
    site.platform === "Shopify" &&
    signals.collectionCategoryPages.status === "missing"
  ) {
    missed.push("Collection pages not detected (common on Shopify storefronts)");
  }

  if (
    site.expectedPlatformConfidence === "confirmed" &&
    site.platform === "BigCommerce" &&
    signals.collectionCategoryPages.status === "missing"
  ) {
    missed.push("Category pages not detected (common on BigCommerce storefronts)");
  }

  return missed;
}

function buildNotes(
  site: TestSite,
  audit: AuditApiResponse,
  detectionQuality: DetectionQuality,
  validationOutcome: ValidationOutcome,
): string[] {
  const notes: string[] = [];

  if (audit.url !== site.url && audit.url.replace(/\/$/, "") !== site.url.replace(/\/$/, "")) {
    notes.push(`Audited URL resolved to ${audit.url}`);
  }

  if (validationOutcome === "review" && audit.platform.platform !== site.platform) {
    notes.push(
      `Platform label mismatch is non-actionable because expected platform confidence is ${site.expectedPlatformConfidence}`,
    );
  }

  if (site.expectedPlatformConfidence === "likely_outdated") {
    notes.push("Expected platform label may be outdated; review against current storefront evidence");
  }

  if (detectionQuality === "blocked") {
    notes.push(BLOCKED_CRAWL_MESSAGE);
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
    const detectionQuality = assessDetectionQuality({
      detectedPlatform: audit.platform.platform,
      platformConfidence: audit.platform.confidence,
      signals,
      crawlSummary: audit.crawlSummary,
    });
    const crawlQuality = assessCrawlQuality(signals);
    const platformMatch = audit.platform.platform === site.platform;
    const validationOutcome = resolveValidationOutcome({
      platformMatch,
      expectedPlatformConfidence: site.expectedPlatformConfidence,
    });

    return {
      merchant: site.merchant,
      url: site.url,
      auditedUrl: audit.url,
      expectedPlatform: site.platform,
      expectedPlatformConfidence: site.expectedPlatformConfidence,
      detectedPlatform: audit.platform.platform,
      platformConfidence: audit.platform.confidence,
      platformMatch,
      validationOutcome,
      actionablePlatformMismatch: isActionablePlatformMismatch(
        platformMatch,
        site.expectedPlatformConfidence,
      ),
      detectionQuality,
      crawlQuality,
      cacheStatus: audit.cacheStatus,
      crawledAt: audit.crawledAt,
      expiresAt: audit.expiresAt,
      signals,
      falsePositives: detectFalsePositives(site, audit),
      missedObviousSignals: detectMissedSignals(site, audit, detectionQuality),
      notes: buildNotes(site, audit, detectionQuality, validationOutcome),
    };
  } catch (error) {
    return {
      merchant: site.merchant,
      url: site.url,
      auditedUrl: site.url,
      expectedPlatform: site.platform,
      expectedPlatformConfidence: site.expectedPlatformConfidence,
      detectedPlatform: "Unknown",
      platformConfidence: "low",
      platformMatch: false,
      validationOutcome: "error",
      actionablePlatformMismatch: false,
      detectionQuality: "blocked",
      crawlQuality: "weak",
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
      actionablePlatformMismatches: results.filter(
        (result) => result.actionablePlatformMismatch,
      ).length,
      unverifiedPlatformReviews: results.filter(
        (result) => result.validationOutcome === "review",
      ).length,
      detectionGood: results.filter((result) => result.detectionQuality === "good").length,
      detectionLimited: results.filter((result) => result.detectionQuality === "limited").length,
      detectionBlocked: results.filter((result) => result.detectionQuality === "blocked").length,
      crawlStrong: results.filter((result) => result.crawlQuality === "strong").length,
      crawlPartial: results.filter((result) => result.crawlQuality === "partial").length,
      crawlWeak: results.filter((result) => result.crawlQuality === "weak").length,
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

function outcomeLabel(outcome: ValidationOutcome): string {
  switch (outcome) {
    case "pass":
      return "PASS";
    case "review":
      return "REVIEW";
    case "mismatch":
      return "MISMATCH";
    case "error":
      return "ERROR";
  }
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
    `| Platform mismatches (informational) | ${report.summary.platformMismatches} |`,
    `| Actionable platform mismatches (confirmed only) | ${report.summary.actionablePlatformMismatches} |`,
    `| Unverified platform reviews | ${report.summary.unverifiedPlatformReviews} |`,
    `| Detection quality: good | ${report.summary.detectionGood} |`,
    `| Detection quality: limited | ${report.summary.detectionLimited} |`,
    `| Detection quality: blocked | ${report.summary.detectionBlocked} |`,
    `| Crawl quality: strong | ${report.summary.crawlStrong} |`,
    `| Crawl quality: partial | ${report.summary.crawlPartial} |`,
    `| Crawl quality: weak | ${report.summary.crawlWeak} |`,
    `| Cache hits | ${report.summary.cacheHits} |`,
    `| Cache misses | ${report.summary.cacheMisses} |`,
    `| Cache bypasses | ${report.summary.cacheBypasses} |`,
    `| Errors | ${report.summary.errors} |`,
    "",
    "## Summary Table",
    "",
    "| Merchant | Expected Platform | Expected Confidence | Detected Platform | Outcome | Detection Quality | Crawl Quality | Cache | Products | Prices | FAQ/Help | Returns | Cart |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ];

  for (const site of report.sites) {
    lines.push(
      `| ${site.merchant} | ${site.expectedPlatform} | ${site.expectedPlatformConfidence} | ${site.detectedPlatform} | ${outcomeLabel(site.validationOutcome)} | ${site.detectionQuality} | ${site.crawlQuality} | ${site.cacheStatus} | ${statusLabel(site.signals.productPages)} | ${statusLabel(site.signals.productPrices)} | ${statusLabel(site.signals.faqHelpCenter)} | ${statusLabel(site.signals.returnsRefundPage)} | ${statusLabel(site.signals.cartCheckout)} |`,
    );
  }

  lines.push("", "## Detailed Results", "");

  for (const site of report.sites) {
    lines.push(`### ${site.merchant}`);
    lines.push("");
    lines.push(`- URL: ${site.url}`);
    lines.push(`- Audited URL: ${site.auditedUrl}`);
    lines.push(`- Expected platform: ${site.expectedPlatform}`);
    lines.push(`- Expected platform confidence: ${site.expectedPlatformConfidence}`);
    lines.push(`- Detected platform: ${site.detectedPlatform} (${site.platformConfidence})`);
    lines.push(`- Validation outcome: ${outcomeLabel(site.validationOutcome)}`);
    lines.push(`- Actionable platform mismatch: ${site.actionablePlatformMismatch ? "yes" : "no"}`);
    lines.push(`- Detection quality: ${site.detectionQuality}`);
    lines.push(`- Crawl quality: ${site.crawlQuality}`);
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

export function formatConsoleStatus(result: SiteValidationResult): string {
  return outcomeLabel(result.validationOutcome);
}
