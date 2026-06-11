import type { DomainReviewRecord, DomainReviewType } from "./domain-review-types";
import { BANNED_DOMAIN_MESSAGE } from "./banned-domain-messages";

export const DOMAIN_REVIEW_BLOCKED_SCAN_STATUS = "domain_review_blocked";

const TYPE_MESSAGES: Record<DomainReviewType, string> = {
  MANUAL_BLOCK: BANNED_DOMAIN_MESSAGE,
  NON_ECOMMERCE:
    "This domain has previously been reviewed and classified as a non-commerce website.",
  BOT_BLOCKED:
    "This storefront previously blocked automated readiness scanning. Scanning is paused to avoid repeated blocks.",
  SERVER_ERROR:
    "This storefront previously returned repeated server errors. Scanning is paused until conditions improve.",
  RATE_LIMITED:
    "This storefront previously rate limited automated scanning. Scanning is paused to avoid repeated limits.",
  TIMEOUT:
    "This storefront previously timed out during automated scanning. Scanning is paused to avoid repeated failures.",
  DNS_FAILURE:
    "This domain previously could not be resolved. Scanning is paused until DNS is stable.",
  SSL_FAILURE:
    "This storefront previously presented an SSL/TLS problem. Scanning is paused until the certificate is fixed.",
  MANUAL_REVIEW:
    "This domain is under manual review. Scanning is paused until the review is complete.",
  UNKNOWN:
    "This domain previously failed scanning. Scanning is paused to avoid repeated failures.",
};

export function getDomainReviewUserMessage(record: DomainReviewRecord): string {
  return TYPE_MESSAGES[record.type];
}

export function getDomainReviewBlockedTitle(record: DomainReviewRecord): string {
  switch (record.type) {
    case "MANUAL_BLOCK":
      return "Scanning restricted";
    case "NON_ECOMMERCE":
      return "Not an ecommerce storefront";
    case "BOT_BLOCKED":
      return "Scanning temporarily paused";
    case "SERVER_ERROR":
      return "Storefront unavailable for scanning";
    case "RATE_LIMITED":
      return "Scan rate limited";
    case "TIMEOUT":
      return "Scan timed out previously";
    case "DNS_FAILURE":
      return "Domain could not be resolved";
    case "SSL_FAILURE":
      return "SSL/TLS issue detected";
    case "MANUAL_REVIEW":
      return "Domain under review";
    default:
      return "Scanning temporarily paused";
  }
}

export function isDomainReviewBlockedScanResponse(
  data: unknown,
): data is {
  scanStatus: typeof DOMAIN_REVIEW_BLOCKED_SCAN_STATUS;
  title?: string;
  message: string;
  reviewType: DomainReviewType;
  reviewStatus: string;
  retryAfter?: string | null;
} {
  if (!data || typeof data !== "object") {
    return false;
  }

  const record = data as Record<string, unknown>;
  return (
    record.scanStatus === DOMAIN_REVIEW_BLOCKED_SCAN_STATUS &&
    typeof record.message === "string" &&
    typeof record.reviewType === "string"
  );
}
