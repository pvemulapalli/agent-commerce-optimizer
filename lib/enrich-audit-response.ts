import { computeAuditConfidence } from "./audit-confidence";
import { buildAuditReportMetadata } from "./audit-metadata";
import { getPlatformBenchmark } from "./benchmarking";
import type { AuditConfidenceReport } from "./audit-confidence";
import type { AuditReportMetadata } from "./audit-metadata";
import type { PlatformBenchmark } from "./benchmarking";
import { buildReadinessReport } from "./readiness-score";
import {
  CURRENT_SCORING_MODEL_VERSION,
  type ScoringModelVersion,
} from "./scoring-model";
import type { AuditApiResponse, GenerationContext, TechnologyDetectionResult } from "./types";
import type { CrawlSummary } from "./crawl-quality";

export interface EnrichedAuditResponse extends AuditApiResponse {
  reportType?: "full";
  crawlSummary: CrawlSummary;
  crawlDurationSec: number | null;
  auditMetadata: AuditReportMetadata;
  auditConfidence: AuditConfidenceReport;
  benchmark: PlatformBenchmark | null;
  technologyDetection?: TechnologyDetectionResult;
  /** Absent on historical reports — treat as legacy when missing. */
  scoringModelVersion?: ScoringModelVersion;
}

export async function enrichAuditResponse(input: {
  audit: AuditApiResponse;
  crawlSummary: CrawlSummary;
  crawlDurationSec: number | null;
  generationContext?: GenerationContext;
  technologyDetection?: TechnologyDetectionResult;
}): Promise<EnrichedAuditResponse> {
  const scoringModelVersion = CURRENT_SCORING_MODEL_VERSION;
  const auditMetadata = buildAuditReportMetadata({
    audit: input.audit,
    crawlSummary: input.crawlSummary,
    crawlDurationSec: input.crawlDurationSec,
    generationContext: input.generationContext,
  });
  const auditConfidence = computeAuditConfidence(auditMetadata);
  const report = buildReadinessReport(input.audit, {
    merchantName: auditMetadata.merchantName,
    scoringModelVersion,
  });

  const benchmark = await getPlatformBenchmark({
    platform: input.audit.platform.platform,
    score: report.score,
  });

  return {
    ...input.audit,
    reportType: "full",
    crawlSummary: input.crawlSummary,
    crawlDurationSec: input.crawlDurationSec,
    auditMetadata,
    auditConfidence,
    benchmark,
    technologyDetection: input.technologyDetection,
    scoringModelVersion,
  };
}
