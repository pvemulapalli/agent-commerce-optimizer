import { createBotVerificationResponse } from "@/lib/bot-verification-api";
import { BotVerificationBlockedError } from "@/lib/bot-verification";
import { enrichAuditResponse } from "@/lib/enrich-audit-response";
import { createIneligibleEcommerceResponse } from "@/lib/ecommerce-eligibility-api";
import { EcommerceIneligibleError } from "@/lib/ecommerce-eligibility";
import { recordEcommerceRejection } from "@/lib/ecommerce-rejection-log";
import { addNonEcommerceDomain } from "@/lib/non-ecommerce-domains";
import { DomainUnreachableError } from "@/lib/domain-reachability";
import { recordAuditHistory } from "@/lib/audit-history";
import { runAudit } from "@/lib/run-audit";
import { validateScanRequest } from "@/lib/scan-request";
import { scanUrlSchema } from "@/lib/scan-request-schema";
import { createScanFailureResponseFromError } from "@/lib/scan-failure-api";
import { recordCompletedScan } from "@/lib/scan-activity";
import { ensureShareableReport } from "@/lib/shareable-reports";
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
    const auditRun = await runAudit(parsed.data.url);
    const crawlDurationSec =
      auditRun.cacheStatus === "HIT"
        ? null
        : Number(((Date.now() - startedAt) / 1000).toFixed(1));

    const response = await enrichAuditResponse({
      audit: auditRun,
      crawlSummary: auditRun.crawlSummary,
      crawlDurationSec,
      generationContext: auditRun.generationContext,
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
      ...(scanRecord ? { scanRecord } : {}),
      ...(shareable
        ? { reportId: shareable.reportId, shareUrl: shareable.shareUrl }
        : {}),
    });
  } catch (error) {
    if (error instanceof BotVerificationBlockedError) {
      return createBotVerificationResponse(error);
    }

    if (error instanceof EcommerceIneligibleError) {
      await recordEcommerceRejection({
        url: parsed.data.url,
        reason: error.assessment.reason,
        ecommerceConfidence: error.assessment.ecommerceConfidence,
      });
      await addNonEcommerceDomain({
        domain: parsed.data.url,
        reason: error.assessment.reason,
      });
      return createIneligibleEcommerceResponse(error.assessment);
    }

    if (error instanceof DomainUnreachableError) {
      return createScanFailureResponseFromError(error);
    }

    const message =
      error instanceof Error ? error.message : "Audit failed unexpectedly";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
