import type { AuditApiResponse, Finding, GenerationContext } from "./types";
import { normalizeDomainFromUrl } from "./domain-normalization";
import { resolveMerchantDisplayName } from "./merchant-name";
import type { CrawlSummary } from "./crawl-quality";

const POLICY_FINDING_IDS = new Set([
  "shipping-page",
  "delivery-information",
  "returns-page",
  "return-policy-page",
  "refund-page",
  "return-portal",
  "help-center",
  "faq-page",
  "contact-page",
  "contact-support",
]);

const STRUCTURED_DATA_FINDING_IDS = new Set([
  "product-schema",
  "offer-schema",
  "organization-schema",
  "faq-schema",
  "breadcrumb-schema",
  "item-list-schema",
  "search-action-schema",
]);

export interface AuditReportMetadata {
  lastCrawled: string;
  pagesCrawled: number;
  productsSampled: number;
  policyPagesFound: number;
  platform: string;
  crawlDurationSec: number | null;
  dataSource: "Live Crawl" | "Cached Scan";
  merchantName: string;
  normalizedDomain: string;
  structuredDataCoverage: number;
}

function countProductsSampled(findings: Finding[]): number {
  const productFinding = findings.find((finding) => finding.id === "product-pages");
  if (productFinding?.evidenceUrls.length) {
    return productFinding.evidenceUrls.length;
  }

  const catalogFindings = findings.filter((finding) =>
    ["product-pages", "collection-pages", "category-pages", "catalog-pages"].includes(
      finding.id,
    ),
  );

  return catalogFindings.reduce(
    (total, finding) => total + Math.max(finding.evidenceUrls.length, finding.status === "detected" ? 1 : 0),
    0,
  );
}

function countPolicyPages(findings: Finding[]): number {
  return findings.filter(
    (finding) =>
      POLICY_FINDING_IDS.has(finding.id) && finding.status === "detected",
  ).length;
}

export function computeStructuredDataCoverage(findings: Finding[]): number {
  const structuredFindings = findings.filter((finding) =>
    STRUCTURED_DATA_FINDING_IDS.has(finding.id),
  );

  if (structuredFindings.length === 0) {
    return 0;
  }

  const detected = structuredFindings.filter(
    (finding) => finding.status === "detected",
  ).length;

  return detected / structuredFindings.length;
}

export function buildAuditReportMetadata(input: {
  audit: AuditApiResponse;
  crawlSummary: CrawlSummary;
  crawlDurationSec: number | null;
  generationContext?: GenerationContext;
}): AuditReportMetadata {
  const { audit, crawlSummary, crawlDurationSec, generationContext } = input;
  const productsSampled = countProductsSampled(audit.findings);
  const policyPagesFound = countPolicyPages(audit.findings);

  return {
    lastCrawled: audit.crawledAt,
    pagesCrawled: crawlSummary.pagesCrawled,
    productsSampled,
    policyPagesFound,
    platform: audit.platform.platform,
    crawlDurationSec,
    dataSource: audit.cacheStatus === "HIT" ? "Cached Scan" : "Live Crawl",
    merchantName: resolveMerchantDisplayName({
      url: audit.url,
      generationPages: generationContext?.pages,
      homepage: generationContext?.homepage,
    }),
    normalizedDomain: normalizeDomainFromUrl(audit.url),
    structuredDataCoverage: computeStructuredDataCoverage(audit.findings),
  };
}
