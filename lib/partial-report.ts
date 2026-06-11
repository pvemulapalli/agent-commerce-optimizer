import { normalizeAuditUrl } from "./audit-url";
import type {
  CacheStatus,
  FullAuditFailureInfo,
  PartialReportResponse,
  TechnologyDetectionResult,
} from "./types";

export function buildPartialReportResponse(input: {
  url: string;
  technologyDetection: TechnologyDetectionResult;
  failure: FullAuditFailureInfo;
  cacheStatus: CacheStatus;
  reportId?: string;
  shareUrl?: string;
}): PartialReportResponse {
  return {
    reportType: "partial",
    scanStatus: "partial_report",
    url: normalizeAuditUrl(input.url),
    crawledAt: input.technologyDetection.crawledAt,
    cacheStatus: input.cacheStatus,
    technologyDetection: input.technologyDetection,
    fullAuditFailure: input.failure,
    reportId: input.reportId,
    shareUrl: input.shareUrl,
  };
}

export function isPartialReportResponse(
  data: unknown,
): data is PartialReportResponse {
  if (!data || typeof data !== "object") {
    return false;
  }

  const record = data as PartialReportResponse;
  return record.reportType === "partial" && record.scanStatus === "partial_report";
}
