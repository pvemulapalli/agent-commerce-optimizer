import type { DomainReviewType } from "./domain-review-types";
import type { FullAuditFailureReason } from "./types";
import type { ScanFailureCode } from "./scan-failure-diagnostics";

const ELIGIBLE_FAILURE_TYPES = new Set<string>([
  "BOT_BLOCKED",
  "SERVER_ERROR",
  "RATE_LIMITED",
  "TIMEOUT",
  "UNKNOWN",
  "SSL_FAILURE",
  "bot_verification",
  "blocked_403",
  "forbidden",
  "origin_5xx",
  "gateway_error",
  "server_error",
  "rate_limited_429",
  "rate_limited",
  "timeout",
  "unknown",
  "site_unreachable",
  "redirect_loop",
  "ssl_failure",
  "ssl_error",
  "partial_audit_failure",
]);

export function shouldOfferStorefrontReviewRequest(failureType: string | null | undefined): boolean {
  if (!failureType) {
    return false;
  }

  return ELIGIBLE_FAILURE_TYPES.has(failureType);
}

export function failureTypeFromScanFailureCode(code: ScanFailureCode): string {
  return code;
}

export function failureTypeFromDomainReviewType(type: DomainReviewType): string {
  return type;
}

export function failureTypeFromFullAuditFailure(reason: FullAuditFailureReason): string {
  return reason;
}
