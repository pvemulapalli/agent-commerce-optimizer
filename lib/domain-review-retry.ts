import type { DomainReviewType } from "./domain-review-types";

/** Default retry windows in days. null = no automatic retry window. */
export const DEFAULT_RETRY_DAYS: Record<DomainReviewType, number | null> = {
  MANUAL_BLOCK: null,
  NON_ECOMMERCE: null,
  BOT_BLOCKED: 30,
  SERVER_ERROR: 7,
  RATE_LIMITED: 7,
  TIMEOUT: 7,
  DNS_FAILURE: 30,
  SSL_FAILURE: 30,
  MANUAL_REVIEW: 30,
  UNKNOWN: 7,
};

export function computeDefaultRetryAfter(
  type: DomainReviewType,
  from = new Date(),
): string | null {
  const days = DEFAULT_RETRY_DAYS[type];

  if (days == null) {
    return null;
  }

  const retry = new Date(from);
  retry.setUTCDate(retry.getUTCDate() + days);
  return retry.toISOString();
}

export function isRetryWindowActive(
  retryAfter: string | null,
  now = Date.now(),
): boolean {
  if (!retryAfter) {
    return false;
  }

  return now < Date.parse(retryAfter);
}
