import dns from "node:dns/promises";
import {
  BotVerificationBlockedError,
  buildBotVerificationDiagnostic,
  detectBotVerificationInCrawl,
  isBotVerificationResponse,
} from "./bot-verification";
import { deleteCachedAuditsForHostname, normalizeAuditUrl } from "./cache";
import {
  gatewayErrorMessage,
  isGatewayErrorContent,
  isGenericHttpBlockPage,
  mapFetchReachabilityError,
  pageContentHaystack,
  SITE_ERROR_MESSAGE,
  SSL_CERTIFICATE_MESSAGE,
} from "./gateway-errors";
import {
  buildScanFailureDiagnostic,
  type ScanFailureDiagnostic,
} from "./scan-failure-diagnostics";
import { isValidAuditHostname } from "./audit-url-validation";
import { assertEntryNotPasswordGated } from "./storefront-access";
import { isShopifyStorefrontPasswordPage } from "./shopify-storefront-password";
import { StorefrontPasswordRequiredError } from "./storefront-password";
import { MERCHANT_SIGNALS_CRAWLER_USER_AGENT } from "./crawler-identity";
import { storefrontFetch } from "./storefront-fetch";
import type { CrawlData, PageData } from "./types";

const REACHABILITY_TIMEOUT_MS = 12_000;
const USER_AGENT = MERCHANT_SIGNALS_CRAWLER_USER_AGENT;

export const DOMAIN_UNREACHABLE_MESSAGE =
  "Unable to reach this website. Please verify the URL and try again.";

export const DNS_RESOLUTION_MESSAGE =
  "Domain could not be resolved. We could not locate this website. Please verify the URL and try again.";

export {
  SITE_ERROR_MESSAGE,
  SSL_CERTIFICATE_MESSAGE,
  isGatewayErrorContent,
  pageContentHaystack,
};

export class DomainUnreachableError extends Error {
  diagnostic: ScanFailureDiagnostic;

  constructor(diagnostic?: ScanFailureDiagnostic | string) {
    const resolved =
      typeof diagnostic === "string"
        ? buildScanFailureDiagnostic("site_unreachable", { message: diagnostic })
        : (diagnostic ?? buildScanFailureDiagnostic("site_unreachable"));

    super(resolved.message);
    this.name = "DomainUnreachableError";
    this.diagnostic = resolved;
  }
}

export class DnsResolutionError extends DomainUnreachableError {
  constructor(message = DNS_RESOLUTION_MESSAGE) {
    super(buildScanFailureDiagnostic("dns_failure", { message }));
    this.name = "DnsResolutionError";
  }
}

async function resolveHostname(hostname: string): Promise<void> {
  try {
    await dns.lookup(hostname);
    return;
  } catch {
    // Fall through to explicit record lookups.
  }

  const lookups = await Promise.allSettled([
    dns.resolve4(hostname),
    dns.resolve6(hostname),
    dns.resolveCname(hostname),
  ]);

  const resolved = lookups.some((result) => result.status === "fulfilled");
  if (!resolved) {
    throw new DnsResolutionError();
  }
}

async function probeSite(url: URL): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REACHABILITY_TIMEOUT_MS);

  try {
    const response = await storefrontFetch(url.href, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      },
    });

    const contentType = response.headers.get("content-type") ?? "";
    const text = await response.text();
    const snippet = text.slice(0, 4000);

    if (isBotVerificationResponse({
      status: response.status,
      bodyText: snippet,
      headers: response.headers,
    })) {
      throw new BotVerificationBlockedError(
        buildBotVerificationDiagnostic({
          status: response.status,
          bodyText: snippet,
          headers: response.headers,
        }),
      );
    }

    if (isGatewayErrorContent(snippet)) {
      throw new DomainUnreachableError(
        buildScanFailureDiagnostic("gateway_error", {
          message: gatewayErrorMessage(snippet),
        }),
      );
    }

    if (response.status === 403) {
      throw new DomainUnreachableError(
        buildScanFailureDiagnostic("blocked_403", { httpStatus: 403 }),
      );
    }

    if (
      (response.status === 404 || response.status === 410) &&
      isGenericHttpBlockPage(snippet, response.status)
    ) {
      throw new DomainUnreachableError(
        buildScanFailureDiagnostic("blocked_403", { httpStatus: response.status }),
      );
    }

    if (response.status === 429) {
      throw new DomainUnreachableError(
        buildScanFailureDiagnostic("rate_limited_429", { httpStatus: 429 }),
      );
    }

    if (response.status >= 500) {
      throw new DomainUnreachableError(
        buildScanFailureDiagnostic("origin_5xx", {
          message: SITE_ERROR_MESSAGE,
          httpStatus: response.status,
        }),
      );
    }

    if (response.status === 404 || response.status === 410) {
      throw new DomainUnreachableError(
        buildScanFailureDiagnostic("not_found", { httpStatus: response.status }),
      );
    }

    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml")
    ) {
      throw new DomainUnreachableError(buildScanFailureDiagnostic("site_unreachable"));
    }

    if (isShopifyStorefrontPasswordPage({ html: snippet, url: response.url })) {
      throw new StorefrontPasswordRequiredError();
    }
  } catch (error) {
    if (error instanceof BotVerificationBlockedError) {
      throw error;
    }

    if (error instanceof StorefrontPasswordRequiredError) {
      throw error;
    }

    if (error instanceof DomainUnreachableError) {
      throw error;
    }

    const mappedMessage = mapFetchReachabilityError(error);
    if (/timeout|abort|timed out/i.test(mappedMessage)) {
      throw new DomainUnreachableError(buildScanFailureDiagnostic("timeout"));
    }

    if (/redirect/i.test(mappedMessage)) {
      throw new DomainUnreachableError(buildScanFailureDiagnostic("redirect_loop"));
    }

    if (mappedMessage === SSL_CERTIFICATE_MESSAGE) {
      throw new DomainUnreachableError(buildScanFailureDiagnostic("ssl_failure"));
    }

    throw new DomainUnreachableError(
      buildScanFailureDiagnostic("site_unreachable", { message: mappedMessage }),
    );
  } finally {
    clearTimeout(timeout);
  }
}

function findEntryPage(data: CrawlData): PageData | undefined {
  return (
    data.pages.find(
      (page) => page.url.replace(/\/$/, "") === data.entryUrl.replace(/\/$/, ""),
    ) ?? data.pages[0]
  );
}

/** Rejects crawls where every page failed or the entry is a gateway/SSL error page. */
export function assertMinimumCrawlHealth(data: CrawlData): void {
  if (detectBotVerificationInCrawl(data)) {
    throw new BotVerificationBlockedError(buildBotVerificationDiagnostic());
  }

  const entry = findEntryPage(data);
  const entryHaystack = entry ? pageContentHaystack(entry) : "";

  if (entry?.htmlSnippet) {
    assertEntryNotPasswordGated({ html: entry.htmlSnippet, url: entry.url });
  }

  if (
    entry &&
    (entry.status === null ||
      entry.status >= 500 ||
      isGatewayErrorContent(entryHaystack))
  ) {
    if (detectBotVerificationInCrawl(data)) {
      throw new BotVerificationBlockedError(buildBotVerificationDiagnostic());
    }

    if (entry.status === 403) {
      throw new DomainUnreachableError(
        buildScanFailureDiagnostic("blocked_403", { httpStatus: 403 }),
      );
    }

    if (entry.status === 429) {
      throw new DomainUnreachableError(
        buildScanFailureDiagnostic("rate_limited_429", { httpStatus: 429 }),
      );
    }

    throw new DomainUnreachableError(
      isGatewayErrorContent(entryHaystack)
        ? buildScanFailureDiagnostic("gateway_error", {
            message: gatewayErrorMessage(entryHaystack),
          })
        : buildScanFailureDiagnostic("origin_5xx", {
            message: SITE_ERROR_MESSAGE,
            httpStatus: entry.status,
          }),
    );
  }

  const healthyPages = data.pages.filter((page) => {
    if (page.status !== 200 || isGatewayErrorContent(pageContentHaystack(page))) {
      return false;
    }

    if (
      page.htmlSnippet &&
      isShopifyStorefrontPasswordPage({ html: page.htmlSnippet, url: page.url })
    ) {
      return false;
    }

    return true;
  });

  if (healthyPages.length === 0) {
    if (detectBotVerificationInCrawl(data)) {
      throw new BotVerificationBlockedError(buildBotVerificationDiagnostic());
    }

    if (
      entry?.htmlSnippet &&
      isShopifyStorefrontPasswordPage({ html: entry.htmlSnippet, url: entry.url })
    ) {
      throw new StorefrontPasswordRequiredError();
    }

    throw new DomainUnreachableError(
      buildScanFailureDiagnostic("origin_5xx", { message: SITE_ERROR_MESSAGE }),
    );
  }
}

/** Validates DNS resolution before HTTP probing or crawling. */
export async function ensureDomainResolvable(inputUrl: string): Promise<void> {
  let url: URL;

  try {
    url = new URL(inputUrl);
  } catch {
    throw new DomainUnreachableError(buildScanFailureDiagnostic("invalid_hostname"));
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new DomainUnreachableError(buildScanFailureDiagnostic("invalid_hostname"));
  }

  const hostname = url.hostname;
  if (!isValidAuditHostname(hostname)) {
    throw new DomainUnreachableError(buildScanFailureDiagnostic("invalid_hostname"));
  }

  await resolveHostname(hostname);
}

/** Validates DNS resolution and HTTP reachability before crawling. */
export async function validateDomainReachability(inputUrl: string): Promise<void> {
  await ensureDomainResolvable(inputUrl);
  await probeSite(new URL(inputUrl));
}

/**
 * Validates reachability and purges any stale cached audit for unreachable domains.
 * Always runs before serving cache or starting a crawl.
 */
export async function ensureDomainReachable(inputUrl: string): Promise<void> {
  try {
    await validateDomainReachability(inputUrl);
  } catch (error) {
    if (error instanceof BotVerificationBlockedError) {
      throw error;
    }

    if (error instanceof StorefrontPasswordRequiredError) {
      throw error;
    }

    if (error instanceof DomainUnreachableError) {
      try {
        const hostname = new URL(normalizeAuditUrl(inputUrl)).hostname;
        await deleteCachedAuditsForHostname(hostname);
      } catch {
        // Ignore cache purge failures — still surface the reachability error.
      }
    }

    throw error;
  }
}
