import { normalizeAuditUrl } from "./audit-url";
import type { RecentScanRecord } from "./scan-activity-types";

/** Most recent scans with a full report available from the homepage. */
export const RECENT_REPORT_LINK_LIMIT = 6;

export function buildRecentReportHomeUrl(url: string): string {
  return `/?url=${encodeURIComponent(normalizeAuditUrl(url))}`;
}

export function getReportLinkableScanIds(recentScans: RecentScanRecord[]): Set<string> {
  return new Set(recentScans.slice(0, RECENT_REPORT_LINK_LIMIT).map((entry) => entry.id));
}
