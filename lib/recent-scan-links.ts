import { normalizeAuditUrl } from "./audit-url";
import { buildShareReportPath } from "./share-report-url";
import type { RecentScanRecord } from "./scan-activity-types";

export function buildRecentReportUrl(entry: RecentScanRecord): string {
  if (entry.shareUrl) {
    return entry.shareUrl;
  }

  if (entry.reportId) {
    return buildShareReportPath(entry.reportId);
  }

  return buildRecentReportHomeUrl(entry.url);
}

/** Most recent scans with a full report available from the homepage. */
export const RECENT_REPORT_LINK_LIMIT = 6;

export function buildRecentReportHomeUrl(url: string): string {
  return `/?url=${encodeURIComponent(normalizeAuditUrl(url))}`;
}

export function getReportLinkableScanIds(recentScans: RecentScanRecord[]): Set<string> {
  return new Set(
    [...recentScans]
      .sort((left, right) => Date.parse(right.scannedAt) - Date.parse(left.scannedAt))
      .slice(0, RECENT_REPORT_LINK_LIMIT)
      .map((entry) => entry.id),
  );
}
