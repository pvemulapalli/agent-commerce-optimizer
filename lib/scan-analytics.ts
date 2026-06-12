import { getAllAuditHistory, type AuditHistoryRecord } from "./audit-history";
import { GENERATED_FIX_ASSET_COUNT } from "./generate-assets";
import { REDIS_REPORT_PREFIX, type ShareableReportRecord } from "./shareable-reports";
import { getRedis, isRedisConfigured } from "./redis";

const FINDING_LABELS: Record<string, string> = {
  "robots-txt": "robots.txt",
  "sitemap-xml": "sitemap.xml",
  "llms-txt": "llms.txt",
  "organization-schema": "Organization schema",
  "product-schema": "Product schema",
  "faq-schema": "FAQ schema",
  "search-action-schema": "SearchAction schema",
  "product-pages": "Product pages",
  "catalog-pages": "Catalog pages",
  "product-prices": "Product prices",
  "cart-checkout-pages": "Cart or checkout pages",
  "checkout-cart-links": "Checkout/cart links",
  "offer-schema": "Offer schema",
  "shipping-page": "Shipping page",
  "returns-page": "Returns page",
  "contact-page": "Contact page",
  "faq-page": "FAQ page",
  "api-developer-docs": "API or developer docs",
  "pricing-information": "Pricing information",
  "product-availability": "Product availability",
  "breadcrumb-schema": "Breadcrumb schema",
  "review-schema": "Review schema",
  "merchant-profile": "Merchant profile",
};

const SIGNAL_FINDING_IDS = {
  robotsTxt: "robots-txt",
  sitemapXml: "sitemap-xml",
  llmsTxt: "llms-txt",
  merchantProfile: "organization-schema",
} as const;

const REPORT_BATCH_SIZE = 50;

export interface ScanAnalyticsCountRow {
  label: string;
  count: number;
  percentage: number;
}

export interface ScanAnalyticsPlatformScore {
  platform: string;
  averageScore: number;
  sampleSize: number;
}

export interface ScanAnalyticsDomainScore {
  domain: string;
  score: number;
  grade: string;
  platform: string;
}

export interface ScanAnalyticsDomainScanCount {
  domain: string;
  scanCount: number;
  platform: string;
}

export interface ScanAnalyticsPlatformOpportunity {
  platform: string;
  opportunities: ScanAnalyticsCountRow[];
}

export interface ScanAnalyticsSignalAdoption {
  count: number;
  percentage: number;
}

export interface ScanAnalyticsReport {
  generatedAt: string;
  dataSource: {
    auditHistoryRecords: number;
    reportsWithFixes: number;
  };
  summary: {
    totalScans: number;
    uniqueDomains: number;
  };
  platformDistribution: ScanAnalyticsCountRow[];
  averageScoreByPlatform: ScanAnalyticsPlatformScore[];
  mostCommonFailedChecks: ScanAnalyticsCountRow[];
  mostCommonGeneratedFixes: ScanAnalyticsCountRow[];
  signalAdoption: {
    robotsTxt: ScanAnalyticsSignalAdoption;
    sitemapXml: ScanAnalyticsSignalAdoption;
    llmsTxt: ScanAnalyticsSignalAdoption;
    merchantProfile: ScanAnalyticsSignalAdoption;
  };
  topScoringDomains: ScanAnalyticsDomainScore[];
  mostScannedDomains: ScanAnalyticsDomainScanCount[];
  topOpportunitiesByPlatform: ScanAnalyticsPlatformOpportunity[];
  publishableInsights: string[];
}

function resolveFindingLabel(findingId: string): string {
  return FINDING_LABELS[findingId] ?? findingId.replace(/-/g, " ");
}

function roundPercentage(count: number, total: number): number {
  if (total === 0) {
    return 0;
  }

  return Math.round((count / total) * 1000) / 10;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function incrementCount(map: Map<string, number>, key: string, amount = 1): void {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function toSortedCountRows(
  map: Map<string, number>,
  total: number,
  labelResolver: (key: string) => string = (key) => key,
  limit = 15,
): ScanAnalyticsCountRow[] {
  return [...map.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([key, count]) => ({
      label: labelResolver(key),
      count,
      percentage: roundPercentage(count, total),
    }));
}

function normalizeHistoryRecord(record: AuditHistoryRecord): AuditHistoryRecord {
  return {
    ...record,
    findingsSummary: {
      detected: record.findingsSummary?.detected ?? 0,
      missing: record.findingsSummary?.missing ?? 0,
      needsReview: record.findingsSummary?.needsReview ?? 0,
      detectedIds: record.findingsSummary?.detectedIds ?? [],
      missingIds: record.findingsSummary?.missingIds ?? [],
      needsReviewIds: record.findingsSummary?.needsReviewIds ?? [],
    },
    topGaps: Array.isArray(record.topGaps) ? record.topGaps : [],
  };
}

function hasDetectedFinding(record: AuditHistoryRecord, findingId: string): boolean {
  return record.findingsSummary.detectedIds.includes(findingId);
}

function buildSignalAdoption(
  records: AuditHistoryRecord[],
  findingId: string,
): ScanAnalyticsSignalAdoption {
  const total = records.length;
  const count = records.filter((record) => hasDetectedFinding(record, findingId)).length;

  return {
    count,
    percentage: roundPercentage(count, total),
  };
}

async function loadReportsWithFixes(
  reportIds: string[],
): Promise<ShareableReportRecord[]> {
  if (!isRedisConfigured() || reportIds.length === 0) {
    return [];
  }

  const redis = getRedis();
  const reports: ShareableReportRecord[] = [];

  for (let index = 0; index < reportIds.length; index += REPORT_BATCH_SIZE) {
    const batch = reportIds.slice(index, index + REPORT_BATCH_SIZE);
    const keys = batch.map((reportId) => `${REDIS_REPORT_PREFIX}${reportId}`);
    const values = await redis.mget(...keys);

    batch.forEach((_, batchIndex) => {
      const raw = Array.isArray(values) ? values[batchIndex] : null;

      if (!raw) {
        return;
      }

      try {
        const parsed =
          typeof raw === "string"
            ? (JSON.parse(raw) as ShareableReportRecord)
            : (raw as ShareableReportRecord);

        if (parsed.fixes?.assets?.length) {
          reports.push(parsed);
        }
      } catch {
        // Ignore malformed report payloads.
      }
    });
  }

  return reports;
}

function buildPublishableInsights(report: ScanAnalyticsReport): string[] {
  const insights: string[] = [];

  if (report.summary.totalScans > 0) {
    insights.push(
      `Merchant Signals has completed ${report.summary.totalScans} storefront readiness scans across ${report.summary.uniqueDomains} unique domains.`,
    );
  }

  const topPlatform = report.platformDistribution[0];
  if (topPlatform) {
    insights.push(
      `${topPlatform.label} is the most-scanned commerce platform (${topPlatform.percentage}% of completed scans).`,
    );
  }

  const lowestPlatform = [...report.averageScoreByPlatform]
    .filter((entry) => entry.sampleSize >= 3)
    .sort((left, right) => left.averageScore - right.averageScore)[0];

  if (lowestPlatform) {
    insights.push(
      `${lowestPlatform.platform} stores average ${lowestPlatform.averageScore}/100 readiness — the lowest among platforms with at least 3 scans.`,
    );
  }

  const topGap = report.mostCommonFailedChecks[0];
  if (topGap) {
    insights.push(
      `${topGap.label} is the most common missing signal (${topGap.percentage}% of scanned storefronts).`,
    );
  }

  if (report.signalAdoption.llmsTxt.percentage < 50) {
    insights.push(
      `Only ${report.signalAdoption.llmsTxt.percentage}% of scanned storefronts publish llms.txt for AI agent discovery.`,
    );
  }

  if (report.signalAdoption.sitemapXml.percentage > 0) {
    insights.push(
      `${report.signalAdoption.sitemapXml.percentage}% of scanned storefronts expose sitemap.xml.`,
    );
  }

  const topFix = report.mostCommonGeneratedFixes[0];
  if (topFix) {
    insights.push(
      `When merchants generate remediation assets, ${topFix.label} is included in ${topFix.percentage}% of fix bundles.`,
    );
  }

  return insights.slice(0, 8);
}

export async function buildScanAnalyticsReport(): Promise<ScanAnalyticsReport> {
  const records = (await getAllAuditHistory()).map(normalizeHistoryRecord);
  const totalScans = records.length;
  const uniqueDomains = new Set(records.map((record) => record.normalizedDomain)).size;

  const platformCounts = new Map<string, number>();
  const platformScores = new Map<string, number[]>();
  const failedCheckCounts = new Map<string, number>();
  const domainScanCounts = new Map<string, { count: number; platform: string }>();
  const bestScoreByDomain = new Map<string, ScanAnalyticsDomainScore>();
  const platformGapCounts = new Map<string, Map<string, number>>();

  for (const record of records) {
    incrementCount(platformCounts, record.platform);

    const scores = platformScores.get(record.platform) ?? [];
    scores.push(record.score);
    platformScores.set(record.platform, scores);

    for (const findingId of record.findingsSummary.missingIds) {
      incrementCount(failedCheckCounts, findingId);
    }

    for (const gap of record.topGaps) {
      const gaps = platformGapCounts.get(record.platform) ?? new Map<string, number>();
      incrementCount(gaps, gap);
      platformGapCounts.set(record.platform, gaps);
    }

    const existingCount = domainScanCounts.get(record.normalizedDomain);
    domainScanCounts.set(record.normalizedDomain, {
      count: (existingCount?.count ?? 0) + 1,
      platform: record.platform,
    });

    const existingBest = bestScoreByDomain.get(record.normalizedDomain);
    if (!existingBest || record.score > existingBest.score) {
      bestScoreByDomain.set(record.normalizedDomain, {
        domain: record.normalizedDomain,
        score: record.score,
        grade: record.grade,
        platform: record.platform,
      });
    }
  }

  const reportIds = [
    ...new Set(
      records
        .map((record) => record.reportId)
        .filter((reportId): reportId is string => Boolean(reportId)),
    ),
  ];
  const reportsWithFixes = await loadReportsWithFixes(reportIds);
  const generatedFixCounts = new Map<string, number>();

  for (const report of reportsWithFixes) {
    for (const asset of report.fixes?.assets ?? []) {
      incrementCount(generatedFixCounts, asset.filename);
    }
  }

  const topOpportunitiesByPlatform = [...platformGapCounts.entries()]
    .map(([platform, gaps]) => {
      const platformTotal = records.filter((record) => record.platform === platform).length;
      return {
        platform,
        opportunities: toSortedCountRows(gaps, platformTotal, (key) => key, 5),
      };
    })
    .filter((entry) => entry.opportunities.length > 0)
    .sort((left, right) => right.opportunities[0]?.count - left.opportunities[0]?.count);

  const analyticsReport: ScanAnalyticsReport = {
    generatedAt: new Date().toISOString(),
    dataSource: {
      auditHistoryRecords: totalScans,
      reportsWithFixes: reportsWithFixes.length,
    },
    summary: {
      totalScans,
      uniqueDomains,
    },
    platformDistribution: toSortedCountRows(
      platformCounts,
      totalScans,
      (platform) => platform,
    ),
    averageScoreByPlatform: [...platformScores.entries()]
      .map(([platform, scores]) => ({
        platform,
        averageScore: Math.round(average(scores)),
        sampleSize: scores.length,
      }))
      .sort(
        (left, right) =>
          right.sampleSize - left.sampleSize || left.platform.localeCompare(right.platform),
      ),
    mostCommonFailedChecks: toSortedCountRows(
      failedCheckCounts,
      totalScans,
      resolveFindingLabel,
      15,
    ),
    mostCommonGeneratedFixes:
      reportsWithFixes.length > 0
        ? toSortedCountRows(
            generatedFixCounts,
            reportsWithFixes.length * GENERATED_FIX_ASSET_COUNT,
            (filename) => filename,
            GENERATED_FIX_ASSET_COUNT,
          )
        : [],
    signalAdoption: {
      robotsTxt: buildSignalAdoption(records, SIGNAL_FINDING_IDS.robotsTxt),
      sitemapXml: buildSignalAdoption(records, SIGNAL_FINDING_IDS.sitemapXml),
      llmsTxt: buildSignalAdoption(records, SIGNAL_FINDING_IDS.llmsTxt),
      merchantProfile: buildSignalAdoption(records, SIGNAL_FINDING_IDS.merchantProfile),
    },
    topScoringDomains: [...bestScoreByDomain.values()]
      .sort((left, right) => right.score - left.score || left.domain.localeCompare(right.domain))
      .slice(0, 10),
    mostScannedDomains: [...domainScanCounts.entries()]
      .map(([domain, value]) => ({
        domain,
        scanCount: value.count,
        platform: value.platform,
      }))
      .sort(
        (left, right) =>
          right.scanCount - left.scanCount || left.domain.localeCompare(right.domain),
      )
      .slice(0, 10),
    topOpportunitiesByPlatform,
    publishableInsights: [],
  };

  analyticsReport.publishableInsights = buildPublishableInsights(analyticsReport);

  return analyticsReport;
}

function escapeCsvValue(value: string | number): string {
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function scanAnalyticsReportToCsv(report: ScanAnalyticsReport): string {
  const rows: string[][] = [["section", "metric", "value", "count", "percentage"]];

  rows.push(["summary", "generatedAt", report.generatedAt, "", ""]);
  rows.push(["summary", "totalScans", "", String(report.summary.totalScans), ""]);
  rows.push(["summary", "uniqueDomains", "", String(report.summary.uniqueDomains), ""]);
  rows.push([
    "dataSource",
    "auditHistoryRecords",
    "",
    String(report.dataSource.auditHistoryRecords),
    "",
  ]);
  rows.push([
    "dataSource",
    "reportsWithFixes",
    "",
    String(report.dataSource.reportsWithFixes),
    "",
  ]);

  for (const row of report.platformDistribution) {
    rows.push(["platformDistribution", row.label, "", String(row.count), String(row.percentage)]);
  }

  for (const row of report.averageScoreByPlatform) {
    rows.push([
      "averageScoreByPlatform",
      row.platform,
      String(row.averageScore),
      String(row.sampleSize),
      "",
    ]);
  }

  for (const row of report.mostCommonFailedChecks) {
    rows.push(["mostCommonFailedChecks", row.label, "", String(row.count), String(row.percentage)]);
  }

  for (const row of report.mostCommonGeneratedFixes) {
    rows.push([
      "mostCommonGeneratedFixes",
      row.label,
      "",
      String(row.count),
      String(row.percentage),
    ]);
  }

  rows.push([
    "signalAdoption",
    "robots.txt",
    "",
    String(report.signalAdoption.robotsTxt.count),
    String(report.signalAdoption.robotsTxt.percentage),
  ]);
  rows.push([
    "signalAdoption",
    "sitemap.xml",
    "",
    String(report.signalAdoption.sitemapXml.count),
    String(report.signalAdoption.sitemapXml.percentage),
  ]);
  rows.push([
    "signalAdoption",
    "llms.txt",
    "",
    String(report.signalAdoption.llmsTxt.count),
    String(report.signalAdoption.llmsTxt.percentage),
  ]);
  rows.push([
    "signalAdoption",
    "merchant-profile (organization schema)",
    "",
    String(report.signalAdoption.merchantProfile.count),
    String(report.signalAdoption.merchantProfile.percentage),
  ]);

  for (const row of report.topScoringDomains) {
    rows.push([
      "topScoringDomains",
      row.domain,
      `${row.score} (${row.grade})`,
      row.platform,
      "",
    ]);
  }

  for (const row of report.mostScannedDomains) {
    rows.push([
      "mostScannedDomains",
      row.domain,
      row.platform,
      String(row.scanCount),
      "",
    ]);
  }

  for (const platformEntry of report.topOpportunitiesByPlatform) {
    for (const opportunity of platformEntry.opportunities) {
      rows.push([
        "topOpportunitiesByPlatform",
        platformEntry.platform,
        opportunity.label,
        String(opportunity.count),
        String(opportunity.percentage),
      ]);
    }
  }

  for (const insight of report.publishableInsights) {
    rows.push(["publishableInsights", insight, "", "", ""]);
  }

  return rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n");
}
