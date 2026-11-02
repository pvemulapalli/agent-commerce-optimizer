import { createBotVerificationResponse } from "@/lib/bot-verification-api";
import { BotVerificationBlockedError } from "@/lib/bot-verification";
import { enrichAuditResponse } from "@/lib/enrich-audit-response";
import { createIneligibleEcommerceResponse } from "@/lib/ecommerce-eligibility-api";
import { EcommerceIneligibleError } from "@/lib/ecommerce-eligibility";
import { recordEcommerceRejection } from "@/lib/ecommerce-rejection-log";
import {
  recordEcommerceIneligibleForDomainReview,
  recordPartialAuditFailureForDomainReview,
  recordScanFailureForDomainReview,
} from "@/lib/domain-review-recording";
import { DomainUnreachableError } from "@/lib/domain-reachability";
import { recordAuditHistory } from "@/lib/audit-history";
import { validateScanRequest } from "@/lib/scan-request";
import { scanUrlSchema } from "@/lib/scan-request-schema";
import { createScanFailureResponseFromError } from "@/lib/scan-failure-api";
import { createStorefrontPasswordResponse } from "@/lib/storefront-password-api";
import { StorefrontPasswordRequiredError } from "@/lib/storefront-password";
import {
  recordCompletedScan,
  recordPartialScan,
} from "@/lib/scan-activity";
import {
  ensureShareablePartialReport,
  ensureShareableReport,
} from "@/lib/shareable-reports";
import { runTwoPhaseAudit } from "@/lib/two-phase-audit";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = scanUrlSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const guardResponse = await validateScanRequest(
    request,
    parsed.data.url,
    parsed.data.turnstileToken,
  );

  if (guardResponse) {
    return guardResponse;
  }

  try {
    const startedAt = Date.now();
    const outcome = await runTwoPhaseAudit(parsed.data.url, {
      storefrontPassword: parsed.data.storefrontPassword,
    });

    if (outcome.kind === "partial") {
      await recordPartialAuditFailureForDomainReview({
        url: parsed.data.url,
        reason: outcome.partialReport.fullAuditFailure.reason,
      });

      const shareable = await ensureShareablePartialReport(outcome.partialReport);
      const partialReport = {
        ...outcome.partialReport,
        ...(shareable
          ? { reportId: shareable.reportId, shareUrl: shareable.shareUrl }
          : {}),
      };

      const scanRecord = await recordPartialScan(partialReport);

      return NextResponse.json({
        ...partialReport,
        technologyDetection: outcome.technologyDetection,
        ...(scanRecord ? { scanRecord } : {}),
      });
    }

    const auditRun = outcome.auditRun;
    const crawlDurationSec =
      auditRun.cacheStatus === "HIT"
        ? null
        : Number(((Date.now() - startedAt) / 1000).toFixed(1));

    const response = await enrichAuditResponse({
      audit: auditRun,
      crawlSummary: auditRun.crawlSummary,
      crawlDurationSec,
      generationContext: auditRun.generationContext,
      technologyDetection: outcome.technologyDetection,
    });
    const shareable = await ensureShareableReport(response);

    if (auditRun.cacheStatus !== "HIT") {
      await recordAuditHistory({
        audit: response,
        confidenceScore: response.auditConfidence.score,
        merchantName: response.auditMetadata.merchantName,
        reportId: shareable?.reportId,
      });
    }

    const scanRecord = await recordCompletedScan({
      ...response,
      reportId: shareable?.reportId,
      shareUrl: shareable?.shareUrl,
    });

    return NextResponse.json({
      ...response,
      reportType: "full" as const,
      technologyDetection: outcome.technologyDetection,
      ...(scanRecord ? { scanRecord } : {}),
      ...(shareable
        ? { reportId: shareable.reportId, shareUrl: shareable.shareUrl }
        : {}),
    });
  } catch (error) {
    if (error instanceof StorefrontPasswordRequiredError) {
      return createStorefrontPasswordResponse(error);
    }

    if (error instanceof BotVerificationBlockedError) {
      await recordScanFailureForDomainReview({ url: parsed.data.url, error });
      return createBotVerificationResponse(error);
    }

    if (error instanceof EcommerceIneligibleError) {
      await recordEcommerceRejection({
        url: parsed.data.url,
        reason: error.assessment.reason,
        ecommerceConfidence: error.assessment.ecommerceConfidence,
      });
      await recordEcommerceIneligibleForDomainReview({
        url: parsed.data.url,
        reason: error.assessment.reason,
      });
      return createIneligibleEcommerceResponse(error.assessment);
    }

    if (error instanceof DomainUnreachableError) {
      await recordScanFailureForDomainReview({ url: parsed.data.url, error });
      return createScanFailureResponseFromError(error);
    }

    const message =
      error instanceof Error ? error.message : "Audit failed unexpectedly";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
