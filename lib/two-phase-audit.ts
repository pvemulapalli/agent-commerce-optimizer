import { isCacheEnabled, readCachedAudit } from "@/lib/cache";
import { normalizeAuditUrl } from "./audit-url";
import { EcommerceIneligibleError } from "./ecommerce-eligibility";
import { classifyFullAuditFailure } from "./full-audit-failure";
import { buildPartialReportResponse } from "./partial-report";
import { buildCachedAuditRunResult, runFullReadinessAudit } from "./run-audit";
import {
  buildTechnologyDetectionFromAudit,
  runTechnologyDetection,
} from "./technology-detection";
import type { PartialReportResponse, TechnologyDetectionResult } from "./types";
import type { AuditRunResult } from "./run-audit";

export type TwoPhaseAuditOutcome =
  | {
      kind: "full";
      auditRun: AuditRunResult;
      technologyDetection: TechnologyDetectionResult;
    }
  | {
      kind: "partial";
      partialReport: PartialReportResponse;
      technologyDetection: TechnologyDetectionResult;
    };

export async function runTwoPhaseAudit(url: string): Promise<TwoPhaseAuditOutcome> {
  const normalizedUrl = normalizeAuditUrl(url);

  if (isCacheEnabled()) {
    const cached = await readCachedAudit(normalizedUrl);
    if (cached) {
      const auditRun = await buildCachedAuditRunResult(cached);
      const technologyDetection = buildTechnologyDetectionFromAudit(auditRun);
      return {
        kind: "full",
        auditRun,
        technologyDetection,
      };
    }
  }

  const technologyDetection = await runTechnologyDetection(normalizedUrl);

  try {
    const auditRun = await runFullReadinessAudit(normalizedUrl, {
      skipInitialReachability: true,
    });

    return {
      kind: "full",
      auditRun,
      technologyDetection,
    };
  } catch (error) {
    if (error instanceof EcommerceIneligibleError) {
      throw error;
    }

    return {
      kind: "partial",
      technologyDetection,
      partialReport: buildPartialReportResponse({
        url: normalizedUrl,
        technologyDetection,
        failure: classifyFullAuditFailure(error),
        cacheStatus: "MISS",
      }),
    };
  }
}
