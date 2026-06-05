import { enrichAuditResponse } from "@/lib/enrich-audit-response";
import { createIneligibleEcommerceResponse } from "@/lib/ecommerce-eligibility-api";
import { EcommerceIneligibleError } from "@/lib/ecommerce-eligibility";
import { recordEcommerceRejection } from "@/lib/ecommerce-rejection-log";
import { DomainUnreachableError } from "@/lib/domain-reachability";
import { runAudit } from "@/lib/run-audit";
import { validateScanRequest } from "@/lib/scan-request";
import { scanUrlSchema } from "@/lib/scan-request-schema";
import { recordCompletedScan } from "@/lib/scan-activity";
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
    });
    const scanRecord = await recordCompletedScan(response);

    return NextResponse.json({
      ...response,
      ...(scanRecord ? { scanRecord } : {}),
    });
  } catch (error) {
    if (error instanceof EcommerceIneligibleError) {
      await recordEcommerceRejection({
        url: parsed.data.url,
        reason: error.assessment.reason,
        ecommerceConfidence: error.assessment.ecommerceConfidence,
      });
      return createIneligibleEcommerceResponse(error.assessment);
    }

    if (error instanceof DomainUnreachableError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const message =
      error instanceof Error ? error.message : "Audit failed unexpectedly";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
