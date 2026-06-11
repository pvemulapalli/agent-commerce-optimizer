import type { FullAuditFailureReason } from "./types";
import type { ScanFailureCode } from "./scan-failure-diagnostics";
import type { DomainReviewType } from "./domain-review-types";

export function classifyDomainReviewTypeFromScanFailureCode(
  code: ScanFailureCode | undefined,
): DomainReviewType {
  switch (code) {
    case "bot_verification":
    case "blocked_403":
      return "BOT_BLOCKED";
    case "rate_limited_429":
      return "RATE_LIMITED";
    case "origin_5xx":
    case "gateway_error":
      return "SERVER_ERROR";
    case "timeout":
      return "TIMEOUT";
    case "dns_failure":
      return "DNS_FAILURE";
    case "ssl_failure":
      return "SSL_FAILURE";
    case "not_found":
    case "invalid_hostname":
    case "site_unreachable":
    case "unknown":
      return "UNKNOWN";
    default:
      return "UNKNOWN";
  }
}

export function classifyDomainReviewTypeFromFullAuditFailure(
  reason: FullAuditFailureReason,
): DomainReviewType {
  switch (reason) {
    case "bot_verification":
    case "forbidden":
      return "BOT_BLOCKED";
    case "rate_limited":
      return "RATE_LIMITED";
    case "server_error":
      return "SERVER_ERROR";
    case "timeout":
      return "TIMEOUT";
    case "dns_error":
      return "DNS_FAILURE";
    case "ssl_error":
      return "SSL_FAILURE";
    case "non_ecommerce":
      return "NON_ECOMMERCE";
    default:
      return "UNKNOWN";
  }
}
