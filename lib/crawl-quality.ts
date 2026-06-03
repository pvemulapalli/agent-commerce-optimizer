import type { CrawlData, Finding, FindingStatus } from "./types";

export interface CrawlSummary {
  entryStatus: number | null;
  pagesCrawled: number;
  pages403: number;
  robotsStatus: number | null;
  sitemapStatus: number | null;
}

export type DetectionQuality = "good" | "limited" | "blocked";
export type CrawlQuality = "strong" | "partial" | "weak";

export function buildCrawlSummary(data: CrawlData): CrawlSummary {
  const entryPage =
    data.pages.find((page) => page.url.replace(/\/$/, "") === data.entryUrl.replace(/\/$/, "")) ??
    data.pages[0];

  return {
    entryStatus: entryPage?.status ?? null,
    pagesCrawled: data.pages.length,
    pages403: data.pages.filter((page) => page.status === 403).length,
    robotsStatus: data.resources.robotsTxt.status,
    sitemapStatus: data.resources.sitemapXml.status,
  };
}

export function inferCrawlSummaryFromFindings(findings: Finding[]): CrawlSummary {
  const robots = findings.find((finding) => finding.id === "robots-txt");
  const sitemap = findings.find((finding) => finding.id === "sitemap-xml");

  const parseStatus = (evidence: string | undefined): number | null => {
    if (!evidence) return null;
    const match = evidence.match(/HTTP (\d{3})/i);
    return match ? Number.parseInt(match[1], 10) : null;
  };

  return {
    entryStatus: null,
    pagesCrawled: 0,
    pages403: 0,
    robotsStatus: parseStatus(robots?.evidence),
    sitemapStatus: parseStatus(sitemap?.evidence),
  };
}

export function isBlockedOrBotProtected(summary: CrawlSummary): boolean {
  const botStatuses = new Set([403, 429]);
  const coreStatuses = [summary.entryStatus, summary.robotsStatus, summary.sitemapStatus];
  const blockedCore = coreStatuses.filter((status) => status !== null && botStatuses.has(status))
    .length;

  if (summary.entryStatus !== null && botStatuses.has(summary.entryStatus)) {
    if (summary.pagesCrawled <= 1) {
      return true;
    }
  }

  if (blockedCore >= 2) return true;
  if (
    summary.robotsStatus === 403 &&
    summary.sitemapStatus === 403
  ) {
    return true;
  }

  if (summary.pagesCrawled > 0 && summary.pages403 / summary.pagesCrawled >= 0.5) {
    return true;
  }

  return false;
}

function isDetected(snapshot: { status: FindingStatus }): boolean {
  return snapshot.status === "detected";
}

function countCommerceSignals(signals: Record<string, { status: FindingStatus }>): number {
  const keys = [
    "productPages",
    "productPrices",
    "shippingDeliveryPage",
    "returnsRefundPage",
    "faqHelpCenter",
    "cartCheckout",
    "collectionCategoryPages",
  ];

  return keys.filter((key) => isDetected(signals[key as keyof typeof signals])).length;
}

export function assessDetectionQuality(input: {
  detectedPlatform: string;
  platformConfidence: string;
  signals: Record<string, { status: FindingStatus }>;
  crawlSummary: CrawlSummary;
}): DetectionQuality {
  if (isBlockedOrBotProtected(input.crawlSummary)) {
    return "blocked";
  }

  const commerceSignals = countCommerceSignals(input.signals);
  const platformKnown = input.detectedPlatform !== "Unknown";
  const platformConfident =
    input.platformConfidence === "high" || input.platformConfidence === "medium";

  if (platformKnown && platformConfident && commerceSignals >= 2) {
    return "good";
  }

  if (commerceSignals >= 1) {
    return "limited";
  }

  if (platformKnown && platformConfident) {
    return "good";
  }

  return "limited";
}

export function assessCrawlQuality(
  signals: Record<string, { status: FindingStatus }>,
): CrawlQuality {
  const hasProducts = isDetected(signals.productPages);
  const hasPrices = isDetected(signals.productPrices);
  const hasSupportPolicy =
    isDetected(signals.shippingDeliveryPage) ||
    isDetected(signals.returnsRefundPage) ||
    isDetected(signals.faqHelpCenter);
  const hasCart = isDetected(signals.cartCheckout);
  const commerceCount = countCommerceSignals(signals);

  if (hasProducts && hasPrices && hasSupportPolicy && hasCart) {
    return "strong";
  }

  if (commerceCount >= 2) {
    return "partial";
  }

  return "weak";
}

export const BLOCKED_CRAWL_MESSAGE =
  "Blocked or bot-protected. Browser rendering may be required.";
