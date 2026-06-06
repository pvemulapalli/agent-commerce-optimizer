import type { AuditReportMetadata } from "./audit-metadata";

export type AuditConfidenceLabel =
  | "High Confidence"
  | "Good Confidence"
  | "Moderate Confidence"
  | "Limited Confidence";

export interface AuditConfidenceReport {
  score: number;
  label: AuditConfidenceLabel;
  signals: string[];
}

function getConfidenceLabel(score: number): AuditConfidenceLabel {
  if (score >= 90) {
    return "High Confidence";
  }
  if (score >= 75) {
    return "Good Confidence";
  }
  if (score >= 50) {
    return "Moderate Confidence";
  }
  return "Limited Confidence";
}

export function computeAuditConfidence(metadata: AuditReportMetadata): AuditConfidenceReport {
  const pagesScore = Math.min(30, (metadata.pagesCrawled / 120) * 30);
  const productsScore = Math.min(25, (metadata.productsSampled / 35) * 25);
  const policiesScore = Math.min(25, (metadata.policyPagesFound / 10) * 25);
  const structuredScore = Math.min(20, metadata.structuredDataCoverage * 20);
  const liveCrawlBonus = metadata.dataSource === "Live Crawl" ? 5 : 0;

  const score = Math.min(
    100,
    Math.round(pagesScore + productsScore + policiesScore + structuredScore + liveCrawlBonus),
  );

  const signals: string[] = [];

  if (metadata.pagesCrawled > 0) {
    signals.push(`${metadata.pagesCrawled} pages crawled`);
  } else {
    signals.push("Limited page coverage from cached summary");
  }

  if (metadata.productsSampled > 0) {
    signals.push(`${metadata.productsSampled} products analyzed`);
  } else {
    signals.push("No product pages sampled");
  }

  if (metadata.policyPagesFound > 0) {
    signals.push(`${metadata.policyPagesFound} policy pages detected`);
  } else {
    signals.push("No policy pages detected");
  }

  if (metadata.dataSource === "Live Crawl") {
    signals.push("Live crawl completed successfully");
  } else {
    signals.push("Results served from cached scan data");
  }

  return {
    score,
    label: getConfidenceLabel(score),
    signals: signals.map((signal) => `✓ ${signal}`),
  };
}
