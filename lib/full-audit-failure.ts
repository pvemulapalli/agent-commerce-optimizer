import { BotVerificationBlockedError } from "./bot-verification";
import { EcommerceIneligibleError } from "./ecommerce-eligibility";
import {
  DnsResolutionError,
  DomainUnreachableError,
} from "./domain-reachability";
import type { FullAuditFailureInfo, FullAuditFailureReason } from "./types";

const FAILURE_COPY: Record<
  FullAuditFailureReason,
  Pick<FullAuditFailureInfo, "title" | "message" | "suggestedNextSteps">
> = {
  bot_verification: {
    title: "Readiness audit interrupted by bot verification",
    message:
      "Technology signals were detected, but automated readiness scanning was blocked by a bot verification challenge during deeper crawling.",
    suggestedNextSteps: [
      "Retry the scan later when bot protection may be relaxed.",
      "Ask your web team to allow Merchant Signals audit traffic for readiness checks.",
      "Review CDN or WAF bot-management rules that challenge non-browser clients.",
    ],
  },
  forbidden: {
    title: "Readiness audit blocked at the edge",
    message:
      "Technology signals were detected, but the storefront blocked deeper readiness crawling with a forbidden response.",
    suggestedNextSteps: [
      "Confirm the storefront allows automated audit traffic on product and policy pages.",
      "Review edge firewall or WAF rules that may block non-browser user agents.",
      "Try scanning a published product or category URL if the homepage behaves differently.",
    ],
  },
  rate_limited: {
    title: "Readiness audit rate limited",
    message:
      "Technology signals were detected, but the storefront rate limited deeper readiness crawling before the audit could finish.",
    suggestedNextSteps: [
      "Wait a few minutes and run the scan again.",
      "Scan a specific product or category URL instead of the homepage.",
      "Review rate-limiting rules that may affect automated audit traffic.",
    ],
  },
  server_error: {
    title: "Readiness audit interrupted by server errors",
    message:
      "Technology signals were detected, but the storefront returned repeated server errors during the readiness audit.",
    suggestedNextSteps: [
      "Verify the origin store is healthy and not in maintenance mode.",
      "Retry the scan after any outage or deployment has settled.",
      "Check CDN or origin error logs for failing product or policy routes.",
    ],
  },
  timeout: {
    title: "Readiness audit timed out",
    message:
      "Technology signals were detected, but deeper readiness crawling timed out before product, category, and policy pages could be analyzed.",
    suggestedNextSteps: [
      "Retry the scan when the storefront is responding quickly.",
      "Scan a lighter entry URL such as a published product page.",
      "Review slow routes or heavy bot challenges that delay automated requests.",
    ],
  },
  redirect_loop: {
    title: "Readiness audit stopped by redirect loop",
    message:
      "Technology signals were detected, but deeper readiness crawling hit a redirect loop and never reached stable storefront pages.",
    suggestedNextSteps: [
      "Review canonical URL and redirect rules for product and policy paths.",
      "Try scanning a direct product or category URL.",
      "Check locale, market, or login redirects that may loop for automated clients.",
    ],
  },
  ssl_error: {
    title: "Readiness audit blocked by SSL/TLS problem",
    message:
      "Technology signals were detected, but deeper readiness crawling could not continue because of an SSL/TLS certificate problem.",
    suggestedNextSteps: [
      "Fix certificate expiration or chain issues on the storefront domain.",
      "Confirm intermediate certificates are served correctly.",
      "Retry the scan after the certificate has been renewed.",
    ],
  },
  dns_error: {
    title: "Readiness audit could not resolve storefront routes",
    message:
      "Technology signals were detected on the entry page, but deeper readiness crawling could not resolve related storefront routes.",
    suggestedNextSteps: [
      "Verify DNS records for the storefront domain and related subdomains.",
      "Confirm the site is published and publicly reachable.",
      "Retry the scan after DNS changes have propagated.",
    ],
  },
  non_ecommerce: {
    title: "Readiness audit stopped — not an ecommerce storefront",
    message:
      "Technology signals were detected, but deeper crawling did not find enough ecommerce storefront evidence to complete a readiness audit.",
    suggestedNextSteps: [
      "Scan a published product or category URL if the homepage is mostly marketing content.",
      "Confirm the URL points to a live ecommerce storefront.",
    ],
  },
  unknown: {
    title: "Readiness audit could not be completed",
    message:
      "Technology signals were detected, but the full readiness audit could not be completed because deeper crawling was blocked or interrupted.",
    suggestedNextSteps: [
      "Retry the scan later.",
      "Try a published product or category URL.",
      "Review bot protection, rate limits, or origin errors that may interrupt automated crawling.",
    ],
  },
};

function mapScanFailureCode(code: string | undefined): FullAuditFailureReason {
  switch (code) {
    case "blocked_403":
      return "forbidden";
    case "rate_limited_429":
      return "rate_limited";
    case "origin_5xx":
    case "gateway_error":
      return "server_error";
    case "timeout":
      return "timeout";
    case "redirect_loop":
      return "redirect_loop";
    case "ssl_failure":
      return "ssl_error";
    case "dns_failure":
      return "dns_error";
    case "bot_verification":
      return "bot_verification";
    default:
      return "unknown";
  }
}

export function buildFullAuditFailureInfo(
  reason: FullAuditFailureReason,
  overrides?: Partial<Pick<FullAuditFailureInfo, "message" | "title" | "suggestedNextSteps" | "httpStatus">>,
): FullAuditFailureInfo {
  const base = FAILURE_COPY[reason];
  return {
    reason,
    title: overrides?.title ?? base.title,
    message: overrides?.message ?? base.message,
    suggestedNextSteps: overrides?.suggestedNextSteps ?? base.suggestedNextSteps,
    httpStatus: overrides?.httpStatus,
  };
}

export function classifyFullAuditFailure(error: unknown): FullAuditFailureInfo {
  if (error instanceof BotVerificationBlockedError) {
    return buildFullAuditFailureInfo("bot_verification", {
      httpStatus: error.diagnostic.httpStatus,
    });
  }

  if (error instanceof EcommerceIneligibleError) {
    return buildFullAuditFailureInfo("non_ecommerce");
  }

  if (error instanceof DnsResolutionError) {
    return buildFullAuditFailureInfo("dns_error");
  }

  if (error instanceof DomainUnreachableError) {
    return buildFullAuditFailureInfo(mapScanFailureCode(error.diagnostic.code), {
      httpStatus: error.diagnostic.httpStatus,
      message: error.diagnostic.message.startsWith("Technology signals")
        ? error.diagnostic.message
        : undefined,
    });
  }

  if (error instanceof Error) {
    const combined = error.message.toLowerCase();

    if (/bot verification|captcha|challenge/i.test(combined)) {
      return buildFullAuditFailureInfo("bot_verification");
    }

    if (/403|forbidden|410 gone/i.test(combined)) {
      return buildFullAuditFailureInfo("forbidden");
    }

    if (/429|rate limit|too many requests/i.test(combined)) {
      return buildFullAuditFailureInfo("rate_limited");
    }

    if (/5\d\d|server error|bad gateway|service unavailable|gateway timeout/i.test(combined)) {
      return buildFullAuditFailureInfo("server_error");
    }

    if (/timeout|timed out|abort/i.test(combined)) {
      return buildFullAuditFailureInfo("timeout");
    }

    if (/redirect/i.test(combined)) {
      return buildFullAuditFailureInfo("redirect_loop");
    }

    if (/certificate|ssl|tls/i.test(combined)) {
      return buildFullAuditFailureInfo("ssl_error");
    }

    if (/dns|could not be resolved/i.test(combined)) {
      return buildFullAuditFailureInfo("dns_error");
    }
  }

  return buildFullAuditFailureInfo("unknown");
}
