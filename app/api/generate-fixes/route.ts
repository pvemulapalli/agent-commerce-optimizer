import { createBotVerificationResponse } from "@/lib/bot-verification-api";
import { BotVerificationBlockedError } from "@/lib/bot-verification";
import { createIneligibleEcommerceResponse } from "@/lib/ecommerce-eligibility-api";
import { EcommerceIneligibleError } from "@/lib/ecommerce-eligibility";
import { recordEcommerceRejection } from "@/lib/ecommerce-rejection-log";
import { DomainUnreachableError } from "@/lib/domain-reachability";
import { generateFixAssets } from "@/lib/generate-assets";
import {
  recordEcommerceIneligibleForDomainReview,
  recordScanFailureForDomainReview,
} from "@/lib/domain-review-recording";
import { runAudit } from "@/lib/run-audit";
import { validateScanRequest } from "@/lib/scan-request";
import { scanUrlSchema } from "@/lib/scan-request-schema";
import { updateShareableReportFixes } from "@/lib/shareable-reports";
import { createStorefrontPasswordResponse } from "@/lib/storefront-password-api";
import { StorefrontPasswordRequiredError } from "@/lib/storefront-password";
import type { GenerateFixesApiResponse } from "@/lib/types";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 120;

const generateFixesSchema = scanUrlSchema.extend({
  reportId: z.string().trim().min(1).optional(),
});

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

  const parsed = generateFixesSchema.safeParse(body);

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
    const audit = await runAudit(parsed.data.url, {
      storefrontPassword: parsed.data.storefrontPassword,
    });
    const assets = generateFixAssets(audit.generationContext);

    const response: GenerateFixesApiResponse = {
      auditedUrl: audit.url,
      generatedAt: new Date().toISOString(),
      assets,
      cacheStatus: audit.cacheStatus,
    };

    if (parsed.data.reportId) {
      await updateShareableReportFixes(parsed.data.reportId, response);
    }

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof StorefrontPasswordRequiredError) {
      return createStorefrontPasswordResponse(error);
    }

    if (error instanceof BotVerificationBlockedError) {
      await recordScanFailureForDomainReview({ url: parsed.data.url, error });
      return createBotVerificationResponse();
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
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const message =
      error instanceof Error ? error.message : "Fix generation failed unexpectedly";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
