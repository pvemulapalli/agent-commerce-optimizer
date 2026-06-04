import { computeAuditConfidence } from "./audit-confidence";
import { buildAuditReportMetadata } from "./audit-metadata";
import { recordAuditHistory } from "./audit-history";
import { getPlatformBenchmark } from "./benchmarking";
import type { AuditConfidenceReport } from "./audit-confidence";
import type { AuditReportMetadata } from "./audit-metadata";
import type { PlatformBenchmark } from "./benchmarking";
import { buildReadinessReport } from "./readiness-score";
import type { AuditApiResponse } from "./types";
import type { CrawlSummary } from "./crawl-quality";

export interface EnrichedAuditResponse extends AuditApiResponse {
  crawlSummary: CrawlSummary;
  crawlDurationSec: number | null;
  auditMetadata: AuditReportMetadata;
  auditConfidence: AuditConfidenceReport;
  benchmark: PlatformBenchmark | null;
}

export async function enrichAuditResponse(input: {
  audit: AuditApiResponse;
  crawlSummary: CrawlSummary;
  crawlDurationSec: number | null;
}): Promise<EnrichedAuditResponse> {
  const auditMetadata = buildAuditReportMetadata({
    audit: input.audit,
    crawlSummary: input.crawlSummary,
    crawlDurationSec: input.crawlDurationSec,
  });
  const auditConfidence = computeAuditConfidence(auditMetadata);
  const report = buildReadinessReport(input.audit);

  const benchmark = await getPlatformBenchmark({
    platform: input.audit.platform.platform,
    score: report.score,
  });

  if (input.audit.cacheStatus !== "HIT") {
    await recordAuditHistory({
      audit: input.audit,
      confidenceScore: auditConfidence.score,
    });
  }

  return {
    ...input.audit,
    crawlSummary: input.crawlSummary,
    crawlDurationSec: input.crawlDurationSec,
    auditMetadata,
    auditConfidence,
    benchmark,
  };
}
