import dns from "node:dns/promises";
import {
  BotVerificationBlockedError,
  detectBotVerificationInCrawl,
  isBotVerificationResponse,
} from "./bot-verification";
import { deleteCachedAuditsForHostname, normalizeAuditUrl } from "./cache";
import {
  gatewayErrorMessage,
  isGatewayErrorContent,
  mapFetchReachabilityError,
  pageContentHaystack,
  SITE_ERROR_MESSAGE,
  SSL_CERTIFICATE_MESSAGE,
} from "./gateway-errors";
import { isValidAuditHostname } from "./audit-url-validation";
import type { CrawlData, PageData } from "./types";

const REACHABILITY_TIMEOUT_MS = 12_000;
const USER_AGENT =
  "AI-Commerce-Discoverability-Audit/1.2 (+https://github.com/agent-commerce-optimizer)";

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
  constructor(message = DOMAIN_UNREACHABLE_MESSAGE) {
    super(message);
    this.name = "DomainUnreachableError";
  }
}

export class DnsResolutionError extends DomainUnreachableError {
  constructor(message = DNS_RESOLUTION_MESSAGE) {
    super(message);
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
    const response = await fetch(url.href, {
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
      throw new BotVerificationBlockedError();
    }

    if (isGatewayErrorContent(snippet)) {
      throw new DomainUnreachableError(gatewayErrorMessage(snippet));
    }

    if (response.status >= 500) {
      throw new DomainUnreachableError(SITE_ERROR_MESSAGE);
    }

    if (response.status === 404 || response.status === 410) {
      throw new DomainUnreachableError();
    }

    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml")
    ) {
      throw new DomainUnreachableError();
    }
  } catch (error) {
    if (error instanceof BotVerificationBlockedError) {
      throw error;
    }

    if (error instanceof DomainUnreachableError) {
      throw error;
    }

    throw new DomainUnreachableError(mapFetchReachabilityError(error));
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
    throw new BotVerificationBlockedError();
  }

  const entry = findEntryPage(data);
  const entryHaystack = entry ? pageContentHaystack(entry) : "";

  if (
    entry &&
    (entry.status === null ||
      entry.status >= 500 ||
      isGatewayErrorContent(entryHaystack))
  ) {
    if (detectBotVerificationInCrawl(data)) {
      throw new BotVerificationBlockedError();
    }

    throw new DomainUnreachableError(
      isGatewayErrorContent(entryHaystack)
        ? gatewayErrorMessage(entryHaystack)
        : SITE_ERROR_MESSAGE,
    );
  }

  const healthyPages = data.pages.filter(
    (page) => page.status === 200 && !isGatewayErrorContent(pageContentHaystack(page)),
  );

  if (healthyPages.length === 0) {
    if (detectBotVerificationInCrawl(data)) {
      throw new BotVerificationBlockedError();
    }

    throw new DomainUnreachableError(SITE_ERROR_MESSAGE);
  }
}

/** Validates DNS resolution and HTTP reachability before crawling. */
export async function validateDomainReachability(inputUrl: string): Promise<void> {
  let url: URL;

  try {
    url = new URL(inputUrl);
  } catch {
    throw new DomainUnreachableError();
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new DomainUnreachableError();
  }

  const hostname = url.hostname;
  if (!isValidAuditHostname(hostname)) {
    throw new DomainUnreachableError();
  }

  await resolveHostname(hostname);
  await probeSite(url);
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
