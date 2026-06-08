import { analyticsDomainFromUrl } from "@/lib/analytics-domain";
import { buildReadinessReport } from "@/lib/readiness-score";
import type { EnrichedAuditResponse } from "@/lib/enrich-audit-response";
import type { RecentScanRecord } from "@/lib/scan-activity-types";

export interface ScanAnalyticsProperties {
  domain?: string;
  platform?: string;
  score?: number | null;
  grade?: string | null;
  top_gap?: string | null;
}

export function compactAnalyticsProperties(
  properties: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined && value !== null),
  );
}

export function scanContextFromAudit(audit: EnrichedAuditResponse): ScanAnalyticsProperties {
  const report = buildReadinessReport(audit);

  return {
    domain: analyticsDomainFromUrl(audit.url),
    platform: audit.platform.platform,
    score: report.score,
    grade: report.grade,
    top_gap: report.topGap,
  };
}

export function scanContextFromRecentScan(entry: RecentScanRecord): ScanAnalyticsProperties {
  return {
    domain: entry.hostname,
    platform: entry.platform,
    score: entry.readinessScore ?? null,
    grade: entry.grade || null,
    top_gap: entry.topGap || null,
  };
}

export function scanContextFromUrl(url: string): ScanAnalyticsProperties {
  return {
    domain: analyticsDomainFromUrl(url),
  };
}
