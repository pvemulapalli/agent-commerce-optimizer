import { readCachedAudit, normalizeAuditUrl } from "./cache";
import {
  createDomainReviewBlockedResponse,
  evaluateDomainReviewBlock,
} from "./domain-review-queue";
import { enforceScanRateLimit } from "./rate-limit";
import { verifyTurnstileToken } from "./turnstile";

async function enforceScanRequestGuards(
  request: Request,
  turnstileToken: string | undefined,
): Promise<Response | null> {
  const rateLimitResponse = await enforceScanRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const turnstileResult = await verifyTurnstileToken(turnstileToken, request);
  if (!turnstileResult.ok) {
    return new Response(JSON.stringify({ error: turnstileResult.error }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return null;
}

/**
 * Applies banned-domain checks always. Rate limits and Turnstile apply only when
 * a fresh crawl may occur (no valid cached audit for the URL).
 */
export async function validateScanRequest(
  request: Request,
  url: string,
  turnstileToken: string | undefined,
): Promise<Response | null> {
  const reviewBlock = await evaluateDomainReviewBlock(url);
  if (reviewBlock) {
    return createDomainReviewBlockedResponse(reviewBlock);
  }

  const normalizedUrl = normalizeAuditUrl(url);
  const cached = await readCachedAudit(normalizedUrl);
  if (cached) {
    return null;
  }

  return enforceScanRequestGuards(request, turnstileToken);
}
