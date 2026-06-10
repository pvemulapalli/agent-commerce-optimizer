import type { PageData } from "./types";

export const SITE_ERROR_MESSAGE =
  "The storefront returned repeated server errors during the scan. This usually indicates a temporary or persistent site outage.";

export const SSL_CERTIFICATE_MESSAGE =
  "This website's SSL certificate could not be verified. The scan cannot run until the site's certificate is valid.";

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

export function gatewayErrorMessage(text: string): string {
  if (/certificate verify failed|unable to get local issuer certificate/i.test(text)) {
    return SSL_CERTIFICATE_MESSAGE;
  }

  return SITE_ERROR_MESSAGE;
}

export function mapFetchReachabilityError(error: unknown): string {
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

  return "Unable to reach this website. Please verify the URL and try again.";
}
