import type { PageData } from "./types";

import type { ScanFailureCode } from "./scan-failure-diagnostics";

export const SITE_ERROR_MESSAGE =
  "The storefront returned repeated server errors during the scan. This usually indicates a temporary or persistent site outage.";

export const SSL_CERTIFICATE_MESSAGE =
  "This website's SSL certificate could not be verified. The scan cannot run until the site's certificate is valid.";

export const HEADERS_OVERFLOW_MESSAGE =
  "This storefront returned unusually large HTTP response headers (often from extensive security policies) that blocked automated analysis before the page body could be read.";

const GATEWAY_ERROR_PATTERNS = [
  /502 bad gateway/i,
  /503 service unavailable/i,
  /504 gateway timeout/i,
  /certificate verify failed/i,
  /unable to get local issuer certificate/i,
];

export function pageContentHaystack(
  page: Pick<PageData, "title" | "metaDescription" | "bodyTextSnippet" | "htmlSnippet">,
): string {
  return [page.title, page.metaDescription, page.bodyTextSnippet, page.htmlSnippet]
    .filter(Boolean)
    .join(" ");
}

export function isGatewayErrorContent(text: string): boolean {
  return GATEWAY_ERROR_PATTERNS.some((pattern) => pattern.test(text));
}

/** Detects nginx/apache default error stubs used to block non-browser clients. */
export function isGenericHttpBlockPage(text: string, status: number): boolean {
  if (status !== 403 && status !== 410 && status !== 404) {
    return false;
  }

  const snippet = text.slice(0, 2000);
  const compact = snippet.replace(/\s+/g, " ").trim();

  if (compact.length > 800) {
    return false;
  }

  return (
    /<title>\s*(403 forbidden|404 not found|410 gone)\s*<\/title>/i.test(snippet) ||
    /<h1>\s*(403 forbidden|404 not found|410 gone)\s*<\/h1>/i.test(snippet) ||
    (/<center>\s*410 gone\s*<\/center>/i.test(snippet) && /nginx/i.test(snippet))
  );
}

export function gatewayErrorMessage(text: string): string {
  if (/certificate verify failed|unable to get local issuer certificate/i.test(text)) {
    return SSL_CERTIFICATE_MESSAGE;
  }

  return SITE_ERROR_MESSAGE;
}

export function formatFetchError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Fetch failed";
  }

  const parts = [error.message];
  if (error.cause instanceof Error) {
    parts.push(error.cause.message);
  } else if (typeof error.cause === "string") {
    parts.push(error.cause);
  }

  return parts.filter(Boolean).join(": ");
}

export function isHeadersOverflowError(error: unknown): boolean {
  const combined = combinedFetchErrorText(error);
  return /headers overflow|header overflow|hpe_header_overflow|max.*header.*size exceeded/i.test(
    combined,
  );
}

function combinedFetchErrorText(error: unknown): string {
  if (typeof error === "string") {
    return error.toLowerCase();
  }

  if (error instanceof Error) {
    const parts = [error.message];
    if (error.cause instanceof Error) {
      parts.push(error.cause.message);
      const code = (error.cause as NodeJS.ErrnoException).code;
      if (code) {
        parts.push(code);
      }
    }
    const code = (error as NodeJS.ErrnoException).code;
    if (code) {
      parts.push(code);
    }
    return parts.join(" ").toLowerCase();
  }

  return "";
}

export function classifyFetchFailureCode(error: unknown): ScanFailureCode | null {
  const combined = combinedFetchErrorText(error);

  if (
    /enotfound|eai_again|enodata|getaddrinfo|could not resolve|nxdomain|dns|not found.*domain|name or service not known/i.test(
      combined,
    )
  ) {
    return "dns_failure";
  }

  if (/certificate|cert_|unable_to_verify|self signed|ssl|routines::/i.test(combined)) {
    return "ssl_failure";
  }

  if (/abort|timeout|timed out|etimedout|und_err_connect_timeout/i.test(combined)) {
    return "timeout";
  }

  if (/redirect|too many/i.test(combined)) {
    return "redirect_loop";
  }

  if (isHeadersOverflowError(error)) {
    return "headers_overflow";
  }

  if (/econnrefused|econnreset|enetunreach|ehostunreach|network/i.test(combined)) {
    return "site_unreachable";
  }

  return null;
}

export function mapFetchReachabilityError(error: unknown): string {
  const code = classifyFetchFailureCode(error);

  if (code === "dns_failure") {
    return "We could not locate this website in public DNS. Verify the domain spelling and that the site is published.";
  }

  if (code === "ssl_failure") {
    return SSL_CERTIFICATE_MESSAGE;
  }

  if (code === "timeout") {
    return "The storefront did not respond within the scan time limit. Slow pages, heavy protection, or network issues can cause this.";
  }

  if (code === "redirect_loop") {
    return "The storefront redirected repeatedly and never returned a stable page. Check canonical URLs and redirect rules.";
  }

  if (code === "headers_overflow") {
    return HEADERS_OVERFLOW_MESSAGE;
  }

  if (error instanceof Error) {
    const parts = [error.message];
    if (error.cause instanceof Error) {
      parts.push(error.cause.message);
    }

    const combined = parts.join(" ").toLowerCase();
    if (/certificate|cert_|unable_to_verify|self signed|ssl|routines::/i.test(combined)) {
      return SSL_CERTIFICATE_MESSAGE;
    }
  }

  return "Merchant Signals could not retrieve a usable response from this storefront. Verify the URL and try again.";
}
