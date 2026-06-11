import type { ConfidenceLevel } from "./types";
import {
  classifyFetchFailureCode,
  mapFetchReachabilityError,
} from "./gateway-errors";
import type { PageData } from "./types";

export const SCAN_FAILED_STATUS = "scan_failed";

export type ScanFailureCode =
  | "dns_failure"
  | "ssl_failure"
  | "blocked_403"
  | "rate_limited_429"
  | "origin_5xx"
  | "timeout"
  | "redirect_loop"
  | "bot_verification"
  | "invalid_hostname"
  | "gateway_error"
  | "not_found"
  | "site_unreachable"
  | "unknown";

export interface ScanFailureDiagnostic {
  code: ScanFailureCode;
  title: string;
  message: string;
  confidence: ConfidenceLevel;
  httpStatus?: number | null;
}

const DIAGNOSTIC_COPY: Record<
  ScanFailureCode,
  Pick<ScanFailureDiagnostic, "title" | "message" | "confidence">
> = {
  dns_failure: {
    title: "Domain could not be resolved",
    message:
      "We could not locate this website in public DNS. Verify the domain spelling and that the site is published.",
    confidence: "high",
  },
  ssl_failure: {
    title: "SSL certificate problem",
    message:
      "This storefront presented an invalid or untrusted SSL certificate. The scan cannot run until the certificate is fixed.",
    confidence: "high",
  },
  blocked_403: {
    title: "Storefront blocked automated scanning",
    message:
      "The storefront returned HTTP 403 to our automated scan. The site may still load normally in a browser—many stores allow human visitors while blocking audit or bot traffic at the edge (for example Akamai or similar WAF rules).",
    confidence: "high",
  },
  rate_limited_429: {
    title: "Storefront rate limited the scan",
    message:
      "The storefront returned too many requests. Wait before retrying or scan a different URL on the same domain.",
    confidence: "high",
  },
  origin_5xx: {
    title: "Storefront returned repeated server errors",
    message:
      "The origin server returned server errors during the scan. This usually indicates a temporary or persistent site outage.",
    confidence: "high",
  },
  timeout: {
    title: "Storefront timed out during scan",
    message:
      "The storefront did not respond within the scan time limit. Slow pages, heavy protection, or network issues can cause this.",
    confidence: "medium",
  },
  redirect_loop: {
    title: "Redirect loop detected",
    message:
      "The storefront redirected repeatedly and never returned a stable page. Check canonical URLs and redirect rules.",
    confidence: "high",
  },
  bot_verification: {
    title: "Bot verification detected",
    message:
      "This storefront is actively challenging automated scanners. Merchant Signals is not blocked permanently, but the site is protecting itself right now.",
    confidence: "high",
  },
  invalid_hostname: {
    title: "Invalid website address",
    message: "Enter a valid website URL or domain before running a scan.",
    confidence: "high",
  },
  gateway_error: {
    title: "Gateway error from storefront",
    message:
      "The storefront returned a gateway or proxy error page. The origin may be down or misconfigured behind a CDN.",
    confidence: "medium",
  },
  not_found: {
    title: "Page not found",
    message:
      "The requested URL returned a not-found response. Try the homepage or a published product page.",
    confidence: "high",
  },
  site_unreachable: {
    title: "Storefront could not be reached",
    message:
      "Merchant Signals could not retrieve a usable HTML response from this storefront. Verify the URL and try again.",
    confidence: "medium",
  },
  unknown: {
    title: "Scan could not be completed",
    message:
      "The scan stopped before results could be generated. Verify the URL and try again later.",
    confidence: "low",
  },
};

export function buildScanFailureDiagnostic(
  code: ScanFailureCode,
  overrides?: Partial<Pick<ScanFailureDiagnostic, "message" | "title" | "confidence" | "httpStatus">>,
): ScanFailureDiagnostic {
  const base = DIAGNOSTIC_COPY[code];
  let message = overrides?.message ?? base.message;

  if (
    code === "blocked_403" &&
    overrides?.httpStatus != null &&
    overrides.message == null
  ) {
    message = `The storefront returned HTTP ${overrides.httpStatus} to our automated scan. The site may still load normally in a browser—many stores allow human visitors while blocking audit or bot traffic at the edge (for example nginx, Akamai, or similar WAF rules).`;
  }

  return {
    code,
    title: overrides?.title ?? base.title,
    message,
    confidence: overrides?.confidence ?? base.confidence,
    httpStatus: overrides?.httpStatus,
  };
}

export function diagnosticFromReachabilityError(error: unknown): ScanFailureDiagnostic {
  if (error instanceof Error) {
    if (error.name === "DnsResolutionError") {
      return buildScanFailureDiagnostic("dns_failure");
    }

    const combined = [error.message, error.cause instanceof Error ? error.cause.message : ""]
      .join(" ")
      .toLowerCase();

    if (/certificate|cert_|unable_to_verify|self signed|ssl|routines::/i.test(combined)) {
      return buildScanFailureDiagnostic("ssl_failure");
    }

    if (/abort|timeout|timed out|etimedout/i.test(combined)) {
      return buildScanFailureDiagnostic("timeout");
    }

    if (/redirect|too many/i.test(combined)) {
      return buildScanFailureDiagnostic("redirect_loop");
    }

    if (/502 bad gateway|503 service unavailable|504 gateway timeout/i.test(combined)) {
      return buildScanFailureDiagnostic("gateway_error");
    }

    if (/403|forbidden/i.test(combined)) {
      return buildScanFailureDiagnostic("blocked_403", { httpStatus: 403 });
    }

    if (/429|too many requests/i.test(combined)) {
      return buildScanFailureDiagnostic("rate_limited_429", { httpStatus: 429 });
    }

    if (/5\d\d|server error/i.test(combined)) {
      return buildScanFailureDiagnostic("origin_5xx");
    }

    if (/404|410|not found/i.test(combined)) {
      return buildScanFailureDiagnostic("not_found");
    }

    if (/invalid hostname|valid website url/i.test(combined)) {
      return buildScanFailureDiagnostic("invalid_hostname");
    }
  }

  return buildScanFailureDiagnostic("site_unreachable");
}

export function buildScanFailureFromFetchError(error: unknown): ScanFailureDiagnostic {
  const code = classifyFetchFailureCode(error) ?? "site_unreachable";

  if (code === "site_unreachable") {
    return buildScanFailureDiagnostic(code, {
      message: mapFetchReachabilityError(error),
    });
  }

  return buildScanFailureDiagnostic(code);
}

export function buildScanFailureFromPageFetch(
  page: Pick<PageData, "error" | "status">,
): ScanFailureDiagnostic {
  return buildScanFailureFromFetchError(page.error ?? "Fetch failed");
}

export function isScanFailureResponse(
  data: unknown,
): data is ScanFailureDiagnostic & { scanStatus: typeof SCAN_FAILED_STATUS } {
  if (!data || typeof data !== "object") {
    return false;
  }

  const record = data as Record<string, unknown>;
  return record.scanStatus === SCAN_FAILED_STATUS && typeof record.message === "string";
}
