import { readCachedAudit, normalizeAuditUrl } from "./cache";
import {
  createBannedDomainResponse,
  isBannedScanUrl,
} from "./banned-domains";
import { createBotVerificationResponse } from "./bot-verification-api";
import { BotVerificationBlockedError } from "./bot-verification";
import {
  createQuarantinedNonEcommerceResponse,
  isQuarantinedNonEcommerceUrl,
} from "./non-ecommerce-domains";
import { ensureDomainReachable, DomainUnreachableError } from "./domain-reachability";
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
  if (await isBannedScanUrl(url)) {
    return createBannedDomainResponse();
  }

  if (await isQuarantinedNonEcommerceUrl(url)) {
    return createQuarantinedNonEcommerceResponse();
  }

  const normalizedUrl = normalizeAuditUrl(url);
  const cached = await readCachedAudit(normalizedUrl);
  if (cached) {
    return null;
  }

  try {
    await ensureDomainReachable(normalizedUrl);
  } catch (error) {
    if (error instanceof BotVerificationBlockedError) {
      return createBotVerificationResponse();
    }

    if (error instanceof DomainUnreachableError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw error;
  }

  return enforceScanRequestGuards(request, turnstileToken);
}
