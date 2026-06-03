import { readCachedAudit, normalizeAuditUrl } from "./cache";
import {
  createBannedDomainResponse,
  isBannedScanUrl,
} from "./banned-domains";
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
  if (isBannedScanUrl(url)) {
    return createBannedDomainResponse();
  }

  const cached = await readCachedAudit(normalizeAuditUrl(url));
  if (cached) {
    return null;
  }

  return enforceScanRequestGuards(request, turnstileToken);
}
